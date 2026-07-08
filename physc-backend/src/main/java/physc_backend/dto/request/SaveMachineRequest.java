package physc_backend.dto.request;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;

public record SaveMachineRequest(
    @NotBlank @Size(max = 100) String name,
    String description,
    @NotBlank String machineData,
    String thumbnail,
    boolean isPublic
) {}
