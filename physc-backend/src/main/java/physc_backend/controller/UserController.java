package physc_backend.controller;

import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.*;
import physc_backend.dto.request.ChangePasswordRequest;
import physc_backend.dto.request.DeleteAccountRequest;
import physc_backend.dto.request.UpdateProfileRequest;
import physc_backend.dto.response.UserProfileResponse;
import physc_backend.dto.response.UserResponse;
import physc_backend.service.UserService;

import java.util.List;

@RestController
@RequestMapping("/api/users")
@RequiredArgsConstructor
public class UserController {

    private final UserService userService;

    @GetMapping("/profile")
    public ResponseEntity<UserResponse> getProfile(Authentication auth) {
        return ResponseEntity.ok(userService.getProfile(userId(auth)));
    }

    @PatchMapping("/profile")
    public ResponseEntity<UserResponse> updateProfile(Authentication auth,
                                                       @Valid @RequestBody UpdateProfileRequest req) {
        return ResponseEntity.ok(userService.updateProfile(userId(auth), req));
    }

    @PostMapping("/change-password")
    public ResponseEntity<Void> changePassword(Authentication auth,
                                               @Valid @RequestBody ChangePasswordRequest req) {
        userService.changePassword(userId(auth), req);
        return ResponseEntity.noContent().build();
    }

    @DeleteMapping("/account")
    public ResponseEntity<Void> deleteAccount(Authentication auth,
                                              @Valid @RequestBody DeleteAccountRequest req) {
        userService.deleteAccount(userId(auth), req);
        return ResponseEntity.noContent().build();
    }

    @GetMapping("/search")
    public ResponseEntity<List<UserProfileResponse>> search(@RequestParam String q) {
        return ResponseEntity.ok(userService.searchUsers(q));
    }

    @GetMapping("/{username}")
    public ResponseEntity<UserProfileResponse> getUserProfile(@PathVariable String username) {
        return ResponseEntity.ok(userService.getUserProfile(username));
    }

    private Long userId(Authentication auth) {
        return (Long) auth.getPrincipal();
    }
}
