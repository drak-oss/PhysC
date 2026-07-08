package physc_backend.service;

import org.springframework.context.annotation.Lazy;
import org.springframework.security.authentication.AuthenticationManager;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import physc_backend.dto.request.LoginRequest;
import physc_backend.dto.request.SignupRequest;
import physc_backend.dto.response.AuthResponse;
import physc_backend.dto.response.UserResponse;
import physc_backend.entity.User;
import physc_backend.repository.UserRepository;

@Service
public class AuthService {
    private final UserRepository userRepository;
    private final PasswordEncoder passwordEncoder;
    private final JwtService jwtService;
    private final AuthenticationManager authenticationManager;

    public AuthService(UserRepository userRepository,
                       PasswordEncoder passwordEncoder,
                       JwtService jwtService,
                       @Lazy AuthenticationManager authenticationManager) {
        this.userRepository = userRepository;
        this.passwordEncoder = passwordEncoder;
        this.jwtService = jwtService;
        this.authenticationManager = authenticationManager;
    }

    public AuthResponse signup(SignupRequest req) {
        if(userRepository.existsByUsername(req.username())) {
            throw new IllegalArgumentException("Username ALready Taken");
        }
        if(userRepository.existsByEmail(req.email())) {
            throw new IllegalArgumentException("Email Already Registered");
        }

        User user = User.builder()
                .username(req.username())
                .email(req.email())
                .password(passwordEncoder.encode(req.password()))
                .build();
        userRepository.save(user);
        return new AuthResponse(jwtService.generateToken(user), UserResponse.from(user));
    }

    public AuthResponse login(LoginRequest req) {
        authenticationManager.authenticate(
                new UsernamePasswordAuthenticationToken(req.username(), req.password())
        );
        User user = userRepository.findByUsername(req.username())
                .orElseThrow(() -> new IllegalArgumentException("User Not Found"));
        return new AuthResponse(jwtService.generateToken(user), UserResponse.from(user));
    }
}
