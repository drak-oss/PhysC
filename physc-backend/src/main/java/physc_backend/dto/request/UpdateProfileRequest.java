package physc_backend.dto.request;

import jakarta.validation.constraints.Email;
import jakarta.validation.constraints.Size;

public record UpdateProfileRequest(
    @Size(min = 3, max = 50) String username,
    @Email String email
) {}
