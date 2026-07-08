package physc_backend.dto.response;

import physc_backend.entity.User;

import java.time.LocalDateTime;

public record UserProfileResponse(
    Long id,
    String username,
    LocalDateTime createdAt,
    long publicMachineCount
) {
    public static UserProfileResponse from(User user, long publicMachineCount) {
        return new UserProfileResponse(
            user.getId(),
            user.getUsername(),
            user.getCreatedAt(),
            publicMachineCount
        );
    }
}
