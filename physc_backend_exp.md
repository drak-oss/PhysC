# PhysC Backend — Deep Explanation

> Spring Boot 3 REST API that handles user authentication and machine persistence. It never runs simulation — all physics is client-side. The backend only stores and retrieves scene JSON and manages user accounts.

---

## Table of Contents

1. [What the Backend Does](#1-what-the-backend-does)
2. [Project Structure](#2-project-structure)
3. [Architecture — Layer Diagram](#3-architecture--layer-diagram)
4. [Database Schema](#4-database-schema)
5. [Security & JWT — Full Request Flow](#5-security--jwt--full-request-flow)
6. [Entity Layer](#6-entity-layer)
7. [Repository Layer](#7-repository-layer)
8. [Service Layer](#8-service-layer)
9. [Controller Layer](#9-controller-layer)
10. [Exception Handling](#10-exception-handling)
11. [Request/Response DTOs](#11-requestresponse-dtos)

---

## 1. What the Backend Does

- Registers and authenticates users (bcrypt + JWT)
- Stores physics machine scenes as JSON blobs in MySQL
- Serves public/private machine listings and search
- Enforces ownership on edit, delete, and private-view
- Provides a fork operation (copies a public machine into a new row with `forked_from_id` set)

Everything the physics simulation does — XPBD, constraints, bodies, rendering — runs in the browser. The backend is a pure data API.

---

## 2. Project Structure

```
physc-backend/
└── src/main/java/physc_backend/
    ├── PhyscBackendApplication.java        — Spring Boot entry point
    │
    ├── config/
    │   ├── CorsConfig.java                 — allow localhost:5173 in dev
    │   ├── SecurityConfig.java             — filter chain, password encoder, auth manager
    │   └── JwtAuthFilter.java              — OncePerRequestFilter, validates Bearer token
    │
    ├── controller/
    │   ├── AuthController.java             — /api/auth/signup, /login, /me
    │   ├── MachineController.java          — /api/machines/...
    │   └── UserController.java             — /api/users/...
    │
    ├── service/
    │   ├── AuthService.java                — signup, login logic
    │   ├── JwtService.java                 — generate, validate, extract claims
    │   ├── MachineService.java             — save, get, update, delete, fork, search
    │   ├── UserService.java                — profile update, password change, delete account
    │   └── UserDetailsServiceImpl.java     — Spring Security user lookup by userId
    │
    ├── entity/
    │   ├── User.java                       — JPA entity for users table
    │   └── Machine.java                    — JPA entity for machines table
    │
    ├── repository/
    │   ├── UserRepository.java             — JPA queries on users
    │   └── MachineRepository.java          — JPA queries on machines (FULLTEXT search)
    │
    ├── dto/
    │   ├── request/
    │   │   ├── SignupRequest.java
    │   │   ├── LoginRequest.java
    │   │   ├── SaveMachineRequest.java
    │   │   ├── UpdateProfileRequest.java
    │   │   ├── ChangePasswordRequest.java
    │   │   └── DeleteAccountRequest.java
    │   └── response/
    │       ├── AuthResponse.java           — { token, user }
    │       ├── UserResponse.java           — { id, username, email }
    │       ├── UserProfileResponse.java    — includes machineCount
    │       ├── MachineResponse.java        — full machine including machineData JSON
    │       └── MachineSummaryResponse.java — list card (no machineData)
    │
    └── exception/
        ├── GlobalExceptionHandler.java     — @ControllerAdvice → HTTP error responses
        ├── ResourceNotFoundException.java  — → 404
        └── UnauthorizedException.java      — → 403
```

---

## 3. Architecture — Layer Diagram

```
                       HTTP Request
                           │
                           ▼
              ┌────────────────────────┐
              │      JwtAuthFilter     │  ← OncePerRequestFilter
              │  (CorsConfig runs first│    Extracts Bearer token
              │   via Spring's filter  │    Validates with JwtService
              │   ordering)           │    Sets userId in SecurityContext
              └────────────┬───────────┘
                           │ SecurityContextHolder.setAuthentication(userId)
                           ▼
              ┌────────────────────────┐
              │    SecurityFilterChain │  ← SecurityConfig
              │  (route-level authz)   │    Permits /api/auth/**
              │                        │    Requires auth for everything else
              └────────────┬───────────┘
                           │
                           ▼
              ┌────────────────────────┐
              │      @RestController   │  ← Controller layer
              │  AuthController        │    Thin — validates @RequestBody
              │  MachineController     │    Extracts userId from Authentication
              │  UserController        │    Delegates to service
              └────────────┬───────────┘
                           │
                           ▼
              ┌────────────────────────┐
              │      @Service          │  ← Business logic
              │  AuthService           │    Ownership checks
              │  MachineService        │    Forking, FULLTEXT search
              │  UserService           │    Password re-verification
              └────────────┬───────────┘
                           │
                           ▼
              ┌────────────────────────┐
              │    JPA Repository      │  ← Data access
              │  UserRepository        │    Spring Data interfaces
              │  MachineRepository     │    Custom @Query for FULLTEXT
              └────────────┬───────────┘
                           │
                           ▼
              ┌────────────────────────┐
              │       MySQL 8          │
              │   users table          │
              │   machines table       │
              └────────────────────────┘
```

**Key design principle:** the controller extracts `userId` from the `Authentication` object (which holds the Long user ID placed there by `JwtAuthFilter`). It never trusts a userId from the request body or URL param. Ownership verification happens in the service layer by comparing the machine's `user.id` against the caller's `userId`.

---

## 4. Database Schema

```sql
-- ─────────────────────────────────────────────
-- USERS
-- ─────────────────────────────────────────────
CREATE TABLE users (
    id          BIGINT         NOT NULL AUTO_INCREMENT PRIMARY KEY,
    username    VARCHAR(50)    NOT NULL UNIQUE,
    email       VARCHAR(255)   NOT NULL UNIQUE,
    password    VARCHAR(255)   NOT NULL,      -- BCrypt hash (60 chars)
    created_at  DATETIME       NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at  DATETIME       NOT NULL DEFAULT CURRENT_TIMESTAMP
                               ON UPDATE CURRENT_TIMESTAMP,

    FULLTEXT INDEX ft_users_search (username),
    INDEX idx_users_username (username),
    INDEX idx_users_email    (email)
);

-- ─────────────────────────────────────────────
-- MACHINES
-- ─────────────────────────────────────────────
CREATE TABLE machines (
    id              BIGINT         NOT NULL AUTO_INCREMENT PRIMARY KEY,
    user_id         BIGINT         NOT NULL,
    forked_from_id  BIGINT         NULL,       -- NULL = original; non-NULL = forked
    name            VARCHAR(100)   NOT NULL,
    description     TEXT           NULL,
    machine_data    JSON           NOT NULL,   -- full scene blob
    thumbnail       TEXT           NULL,       -- base64 JPEG data URI (480×270)
    is_public       TINYINT(1)     NOT NULL DEFAULT 0,
    created_at      DATETIME       NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at      DATETIME       NOT NULL DEFAULT CURRENT_TIMESTAMP
                                   ON UPDATE CURRENT_TIMESTAMP,

    CONSTRAINT fk_machines_user       FOREIGN KEY (user_id)
        REFERENCES users(id) ON DELETE CASCADE,

    CONSTRAINT fk_machines_forked_from FOREIGN KEY (forked_from_id)
        REFERENCES machines(id) ON DELETE SET NULL,

    FULLTEXT INDEX ft_machines_search (name, description),
    INDEX idx_machines_user_id    (user_id),
    INDEX idx_machines_is_public  (is_public),
    INDEX idx_machines_updated    (updated_at),
    INDEX idx_machines_forked_from (forked_from_id)
);
```

**Why `machine_data` as a JSON column and not normalised tables?**
The access pattern is always "load entire machine" or "save entire machine." You never need to query "all machines containing a HingeConstraint." A JSON column gives you:
- Single-row read/write for save and load
- MySQL 8 JSON validation (rejects malformed JSON)
- No joins, no N+1 loading problem
- Easy versioning via a `"version": 1` field inside the JSON

**Why `forked_from_id ON DELETE SET NULL` and not CASCADE?**
If the original machine is deleted, forks keep all their data — they just lose the attribution pointer. `ON DELETE CASCADE` would delete all forks when the parent is deleted, which is the wrong behaviour.

**machine_data JSON structure** (stored as a string, parsed by the frontend):
```json
{
  "version": 1,
  "machineTitle": "Crank-Lever",
  "bodies": [ { "id": 101, "shape": "Box", "x": 700, ... } ],
  "constraints": [ { "id": 201, "type": "Hinge", "bodyA": 101, ... } ],
  "ignorePairs": [ [101, 9001] ]
}
```

---

## 5. Security & JWT — Full Request Flow

### 5.1 Spring Security Filter Chain

```
Incoming HTTP Request
        │
        ▼
   CorsConfig filter         ← sets CORS headers, allows /api/** from localhost:5173
        │
        ▼
   JwtAuthFilter             ← OncePerRequestFilter (runs once per request)
        │
        ├─ No Authorization header?  → chain.doFilter() (continues unauthenticated)
        │
        ├─ Header doesn't start with "Bearer "?  → chain.doFilter()
        │
        ├─ JwtService.validateToken(token)
        │       ├─ parses HS256 signature
        │       ├─ checks expiry
        │       └─ returns true/false
        │
        ├─ valid → JwtService.extractUserId(token) → Long userId
        │
        ├─ SecurityContextHolder.setAuthentication(
        │       new UsernamePasswordAuthenticationToken(userId, null, emptyList))
        │
        └─ chain.doFilter()  ← continues to Spring Security's authorization layer
                │
                ▼
        SecurityFilterChain (SecurityConfig)
                │
                ├─ /api/auth/**          → permitAll
                ├─ GET /api/machines/public   → permitAll
                ├─ GET /api/machines/search   → permitAll
                ├─ GET /api/machines/user/**  → permitAll
                ├─ GET /api/users/search      → permitAll
                ├─ GET /api/users/{username}  → permitAll
                └─ any other request    → must be authenticated
                                              (auth.getPrincipal() gives userId)
```

**Note:** `JwtAuthFilter` stores only the `userId` (a `Long`) as the principal — not a `UserDetails` object. This means no DB call happens on every authenticated request. The userId is extracted directly from the JWT claims (`sub` field).

### 5.2 Signup Flow

```
POST /api/auth/signup
{ username, email, password }
        │
        ▼
AuthController.signup()
        │
        ▼
AuthService.signup(req)
        │
        ├─ userRepository.existsByUsername(req.username)
        │       → throws IllegalArgumentException if taken
        │
        ├─ userRepository.existsByEmail(req.email)
        │       → throws IllegalArgumentException if taken
        │
        ├─ User user = User.builder()
        │       .username(req.username)
        │       .email(req.email)
        │       .password(passwordEncoder.encode(req.password))  ← BCrypt cost=10
        │       .build()
        │
        ├─ userRepository.save(user)   ← INSERT INTO users ...
        │
        └─ return AuthResponse {
               token: jwtService.generateToken(user),
               user: UserResponse { id, username, email }
           }
```

### 5.3 Login Flow

```
POST /api/auth/login
{ username, password }
        │
        ▼
AuthService.login(req)
        │
        ├─ authenticationManager.authenticate(
        │       UsernamePasswordAuthenticationToken(username, password))
        │
        │   internally:
        │       DaoAuthenticationProvider.authenticate()
        │           → UserDetailsServiceImpl.loadUserByUsername(username)
        │               → userRepository.findById(userId)
        │           → BCryptPasswordEncoder.matches(raw, hash)
        │           → throws BadCredentialsException if mismatch
        │
        ├─ userRepository.findByUsername(req.username) → User
        │
        └─ return AuthResponse { token, user }
```

### 5.4 JWT Token Structure

```
Header:  { "alg": "HS256", "typ": "JWT" }
Payload: {
  "sub": "42",               ← user.getId().toString()
  "username": "devendra",    ← extra claim
  "iat": 1720000000,
  "exp": 1720086400          ← iat + expiryMs (86400000ms = 24 hours)
}
Signature: HMAC-SHA256(base64(header) + "." + base64(payload), secretKey)
```

`JwtService.generateToken(user)` uses `jjwt` 0.12:
```java
return Jwts.builder()
    .subject(user.getId().toString())
    .claim("username", user.getUsername())
    .issuedAt(new Date())
    .expiration(new Date(System.currentTimeMillis() + expiryMs))
    .signWith(getSigningKey())   // Keys.hmacShaKeyFor(BASE64.decode(secret))
    .compact();
```

`JwtService.extractUserId(token)`:
```java
Claims claims = Jwts.parser()
    .verifyWith(getSigningKey())
    .build()
    .parseSignedClaims(token)
    .getPayload();
return Long.parseLong(claims.getSubject());  // "42" → 42L
```

### 5.5 Protected Request Flow

```
GET /api/machines/my
Authorization: Bearer eyJhbGciOiJIUzI1NiJ9...
        │
        ▼
JwtAuthFilter:
    token = header.substring(7)
    jwtService.validateToken(token) → true
    userId = jwtService.extractUserId(token) → 42L
    SecurityContextHolder sets Authentication{ principal: 42L }
        │
        ▼
SecurityConfig: /api/machines/my → requires authenticated → passes
        │
        ▼
MachineController.listMy(Authentication auth):
    Long userId = (Long) auth.getPrincipal()  → 42L
    return machineService.listMy(userId)
        │
        ▼
MachineService.listMy(42L):
    machineRepository.findAllByUserId(42L)
    → stream.map(MachineSummaryResponse::from)
    → List<MachineSummaryResponse>
```

---

## 6. Entity Layer

### User.java

```java
@Entity @Table(name = "users")
@Getter @Setter @NoArgsConstructor @AllArgsConstructor @Builder
public class User {
    @Id @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(unique = true, nullable = false, length = 50)
    private String username;

    @Column(unique = true, nullable = false)
    private String email;

    @Column(nullable = false)
    private String password;           // BCrypt hash — never plain text

    @CreationTimestamp
    @Column(nullable = false, updatable = false)
    private LocalDateTime createdAt;

    @UpdateTimestamp
    @Column(nullable = false)
    private LocalDateTime updatedAt;
}
```

`@CreationTimestamp` and `@UpdateTimestamp` are Hibernate annotations — Hibernate sets them automatically; they don't need to be in application code. This matches the SQL `DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP` behaviour.

### Machine.java

```java
@Entity @Table(name = "machines")
@Getter @Setter @NoArgsConstructor @AllArgsConstructor @Builder
public class Machine {
    @Id @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "user_id", nullable = false)
    private User user;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "forked_from_id")
    private Machine forkedFrom;          // null = original; non-null = forked

    @Column(nullable = false, length = 100)
    private String name;

    @Column(columnDefinition = "TEXT")
    private String description;

    @Column(columnDefinition = "JSON", nullable = false)
    private String machineData;          // stored as String, parsed by frontend

    @Column(columnDefinition = "TEXT")
    private String thumbnail;            // base64 JPEG data URI

    @Column(nullable = false)
    private boolean isPublic = false;

    @CreationTimestamp @Column(nullable = false, updatable = false)
    private LocalDateTime createdAt;

    @UpdateTimestamp @Column(nullable = false)
    private LocalDateTime updatedAt;
}
```

**Why `FetchType.LAZY` on `user` and `forkedFrom`?**
When you load a list of machines for the gallery, you don't need to load the full User object for each one. Lazy loading means the User is fetched only if you call `machine.getUser()` — or in the case of `MachineSummaryResponse`, we access just `machine.getUser().getUsername()`, which triggers one additional SELECT per machine. For the gallery list this is an N+1 query. A production improvement would be a `@EntityGraph` or a JPQL JOIN FETCH to load user info in one query.

---

## 7. Repository Layer

### UserRepository

```java
public interface UserRepository extends JpaRepository<User, Long> {
    Optional<User> findByUsername(String username);
    boolean existsByUsername(String username);
    boolean existsByEmail(String email);
}
```

All methods are auto-implemented by Spring Data from the method name. No SQL needed.

### MachineRepository

```java
public interface MachineRepository extends JpaRepository<Machine, Long> {
    List<Machine> findAllByUserId(Long userId);
    List<Machine> findAllByIsPublicTrue();
    List<Machine> findAllByUserIdAndIsPublicTrue(Long userId);

    @Query(value = """
        SELECT * FROM machines
        WHERE is_public = 1
          AND MATCH(name, description) AGAINST (:query IN BOOLEAN MODE)
        ORDER BY MATCH(name, description) AGAINST (:query IN BOOLEAN MODE) DESC
        """, nativeQuery = true)
    List<Machine> searchPublicMachines(@Param("query") String query);
}
```

**FULLTEXT search:** `searchPublicMachines` uses MySQL FULLTEXT in BOOLEAN MODE. The service layer transforms user input:
```java
String fulltextQuery = Arrays.stream(query.trim().split("\\s+"))
    .map(word -> word + "*")              // "crank" → "crank*" (prefix match)
    .collect(Collectors.joining(" "));    // "crank lever" → "crank* lever*"
```
This makes search prefix-aware — typing "cran" matches "crank", "cranking", etc.

---

## 8. Service Layer

### AuthService

Handles signup and login. The key point about login: it delegates credential verification to Spring Security's `AuthenticationManager` rather than manually calling `BCryptPasswordEncoder.matches()`. This means Spring Security's full authentication event chain fires — failed attempts can be logged, locked, etc. without changing service code.

```java
public AuthResponse login(LoginRequest req) {
    // delegates to DaoAuthenticationProvider → UserDetailsServiceImpl → BCrypt
    authenticationManager.authenticate(
        new UsernamePasswordAuthenticationToken(req.username(), req.password())
    );
    // only reaches here if authenticate() didn't throw
    User user = userRepository.findByUsername(req.username()).orElseThrow(...);
    return new AuthResponse(jwtService.generateToken(user), UserResponse.from(user));
}
```

`@Lazy` on `AuthenticationManager` in the constructor breaks a circular dependency:
`SecurityConfig` → `AuthService` → `AuthenticationManager` → `SecurityConfig`.
The `@Lazy` annotation defers `AuthenticationManager` creation until first use.

### MachineService

```
MachineService methods and what they do:

save(userId, req)
    Loads User by userId → builds Machine entity → saves → returns MachineResponse

get(machineId, currentUserId)
    Loads Machine → checks isPublic or owner matches → returns MachineResponse
    UnauthorizedException if private and not owner

update(machineId, userId, req)
    Loads Machine → checks machine.user.id == userId → updates fields → saves
    UnauthorizedException if not owner

delete(machineId, userId)
    Loads Machine → checks ownership → machineRepository.delete(machine)
    Cascade in DB: no orphaned machines when user is deleted

listMy(userId)
    machineRepository.findAllByUserId(userId) → MachineSummaryResponse list

listPublic()
    machineRepository.findAllByIsPublicTrue() → MachineSummaryResponse list

listPublicByUsername(username)
    finds User by username → findAllByUserIdAndIsPublicTrue → summary list

search(query)
    rejects query < 2 chars → builds FULLTEXT boolean query → searchPublicMachines

fork(sourceId, userId)
    Loads source machine → checks public or owner → builds new Machine
    sets forkedFrom = source (FK), isPublic = false (forks start private)
    saves → returns MachineResponse of the new copy
```

**Fork logic in detail:**
```java
Machine forked = Machine.builder()
    .user(owner)
    .forkedFrom(source)           // sets forked_from_id FK
    .name(source.getName())       // copies all scene data
    .description(source.getDescription())
    .machineData(source.getMachineData())
    .thumbnail(source.getThumbnail())
    .isPublic(false)              // fork is always private initially
    .build();
```

The frontend can check `machine.forkedFromId != null` to show a "Forked from..." attribution badge.

---

## 9. Controller Layer

All controllers are thin. They:
1. Validate the request body with `@Valid`
2. Extract `userId` from `Authentication` (which holds the Long set by `JwtAuthFilter`)
3. Call the service
4. Return a `ResponseEntity`

### AuthController

```
POST /api/auth/signup   → AuthService.signup()  → 201 Created + { token, user }
POST /api/auth/login    → AuthService.login()   → 200 OK + { token, user }
GET  /api/auth/me       → loads User by userId from JWT → 200 OK + UserResponse
```

`/me` is how the frontend hydrates user state on page load — it checks localStorage for a token, calls `/me`, and if the token is valid gets the user back. If the token is expired, JwtAuthFilter won't set authentication, Spring Security rejects the request with 401, the Axios interceptor in `client.js` catches the 401 and clears localStorage, redirecting to `/login`.

### MachineController

```java
// Extract userId from JWT principal
private Long userId(Authentication auth) {
    return (Long) auth.getPrincipal();
}

POST   /api/machines           → save(userId, req)              → 201
GET    /api/machines/my        → listMy(userId)                 → 200
GET    /api/machines/public    → listPublic()                   → 200 (no auth)
GET    /api/machines/user/{u}  → listPublicByUsername(u)        → 200 (no auth)
GET    /api/machines/search?q= → search(q)                      → 200 (no auth)
GET    /api/machines/{id}      → get(id, userId)                → 200
PUT    /api/machines/{id}      → update(id, userId, req)        → 200
DELETE /api/machines/{id}      → delete(id, userId)             → 204
POST   /api/machines/{id}/fork → fork(id, userId)               → 201
```

Note that `GET /api/machines/{id}` receives `Authentication auth` but `auth` may be null (unauthenticated). `userId(auth)` would NPE. The service handles this: if `auth == null`, `currentUserId = null`, and `machine.getUser().getId().equals(null)` is false, so private machines correctly block unauthenticated access.

---

## 10. Exception Handling

```java
@ControllerAdvice
public class GlobalExceptionHandler {

    @ExceptionHandler(ResourceNotFoundException.class)
    ResponseEntity<ErrorResponse> handleNotFound(ResourceNotFoundException ex) {
        return ResponseEntity.status(404).body(new ErrorResponse(ex.getMessage()));
    }

    @ExceptionHandler(UnauthorizedException.class)
    ResponseEntity<ErrorResponse> handleUnauthorized(UnauthorizedException ex) {
        return ResponseEntity.status(403).body(new ErrorResponse(ex.getMessage()));
    }

    @ExceptionHandler(IllegalArgumentException.class)
    ResponseEntity<ErrorResponse> handleBadArg(IllegalArgumentException ex) {
        return ResponseEntity.status(400).body(new ErrorResponse(ex.getMessage()));
    }

    @ExceptionHandler(MethodArgumentNotValidException.class)
    ResponseEntity<Map<String, String>> handleValidation(MethodArgumentNotValidException ex) {
        // returns field-level errors: { "username": "must not be blank" }
    }
}
```

This means **services never need to set HTTP status codes** — they throw typed exceptions, the handler converts them. Controllers never need try/catch blocks.

---

## 11. Request/Response DTOs

DTOs use Java records (immutable, no boilerplate). Bean Validation annotations enforce input rules before the service even runs.

```java
// Records are the preferred DTO type in Java 17+
public record SignupRequest(
    @NotBlank @Size(min=3, max=50) String username,
    @NotBlank @Email String email,
    @NotBlank @Size(min=6) String password
) {}

public record LoginRequest(
    @NotBlank String username,
    @NotBlank String password
) {}

public record SaveMachineRequest(
    @NotBlank @Size(max=100) String name,
    String description,
    @NotNull Boolean isPublic,
    String thumbnail,
    @NotBlank String machineData     // raw JSON string from frontend
) {}
```

Response records have static factory methods:
```java
public record UserResponse(Long id, String username, String email) {
    public static UserResponse from(User user) {
        return new UserResponse(user.getId(), user.getUsername(), user.getEmail());
    }
}

public record MachineSummaryResponse(
    Long id, String name, String description,
    String thumbnail, boolean isPublic,
    Long userId, String username,
    LocalDateTime createdAt, LocalDateTime updatedAt,
    Long forkedFromId
) {
    public static MachineSummaryResponse from(Machine m) {
        return new MachineSummaryResponse(
            m.getId(), m.getName(), m.getDescription(),
            m.getThumbnail(), m.isPublic(),
            m.getUser().getId(), m.getUser().getUsername(),
            m.getCreatedAt(), m.getUpdatedAt(),
            m.getForkedFrom() != null ? m.getForkedFrom().getId() : null
        );
    }
}
```

`MachineResponse` extends this by including the full `machineData` JSON string — used when loading a machine into the editor. `MachineSummaryResponse` omits it for gallery lists to avoid sending large JSON blobs unnecessarily.
