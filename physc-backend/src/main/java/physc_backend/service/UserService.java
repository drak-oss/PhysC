package physc_backend.service;

import lombok.RequiredArgsConstructor;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import physc_backend.dto.request.ChangePasswordRequest;
import physc_backend.dto.request.DeleteAccountRequest;
import physc_backend.dto.request.UpdateProfileRequest;
import physc_backend.dto.response.UserProfileResponse;
import physc_backend.dto.response.UserResponse;
import physc_backend.entity.User;
import physc_backend.exception.ResourceNotFoundException;
import physc_backend.repository.MachineRepository;
import physc_backend.repository.UserRepository;

import java.util.List;

@Service
@RequiredArgsConstructor
@Transactional(readOnly = true)
public class UserService {

    private final UserRepository userRepository;
    private final MachineRepository machineRepository;
    private final PasswordEncoder passwordEncoder;

    public UserResponse getProfile(Long userId) {
        return UserResponse.from(findUser(userId));
    }

    @Transactional
    public UserResponse updateProfile(Long userId, UpdateProfileRequest req) {
        User user = findUser(userId);

        if (req.username() != null && !req.username().equals(user.getUsername())) {
            if (userRepository.existsByUsername(req.username())) {
                throw new IllegalArgumentException("Username already taken");
            }
            user.setUsername(req.username());
        }

        if (req.email() != null && !req.email().equals(user.getEmail())) {
            if (userRepository.existsByEmail(req.email())) {
                throw new IllegalArgumentException("Email already registered");
            }
            user.setEmail(req.email());
        }

        return UserResponse.from(userRepository.save(user));
    }

    @Transactional
    public void changePassword(Long userId, ChangePasswordRequest req) {
        User user = findUser(userId);

        if (!passwordEncoder.matches(req.currentPassword(), user.getPassword())) {
            throw new IllegalArgumentException("Current password is incorrect");
        }
        if (req.currentPassword().equals(req.newPassword())) {
            throw new IllegalArgumentException("New password must be different from current password");
        }

        user.setPassword(passwordEncoder.encode(req.newPassword()));
        userRepository.save(user);
    }

    @Transactional
    public void deleteAccount(Long userId, DeleteAccountRequest req) {
        User user = findUser(userId);

        if (!passwordEncoder.matches(req.password(), user.getPassword())) {
            throw new IllegalArgumentException("Incorrect password");
        }

        userRepository.delete(user);
    }

    public UserProfileResponse getUserProfile(String username) {
        User user = userRepository.findByUsername(username)
            .orElseThrow(() -> new ResourceNotFoundException("User not found: " + username));
        long count = machineRepository.countByUserIdAndIsPublicTrue(user.getId());
        return UserProfileResponse.from(user, count);
    }

    public List<UserProfileResponse> searchUsers(String query) {
        if (query == null || query.trim().length() < 2) {
            return List.of();
        }
        return userRepository.findByUsernameContainingIgnoreCase(query.trim())
            .stream()
            .map(u -> UserProfileResponse.from(u, machineRepository.countByUserIdAndIsPublicTrue(u.getId())))
            .toList();
    }

    private User findUser(Long userId) {
        return userRepository.findById(userId)
            .orElseThrow(() -> new ResourceNotFoundException("User not found"));
    }
}
