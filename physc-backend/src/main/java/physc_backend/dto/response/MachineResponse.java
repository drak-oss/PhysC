package physc_backend.dto.response;

import physc_backend.entity.Machine;

import java.time.LocalDateTime;

public record MachineResponse(
    Long id,
    String name,
    String description,
    String machineData,
    String thumbnail,
    boolean isPublic,
    Long ownerId,
    String ownerUsername,
    Long forkedFromId,
    LocalDateTime createdAt,
    LocalDateTime updatedAt
) {
    public static MachineResponse from(Machine m) {
        return new MachineResponse(
            m.getId(),
            m.getName(),
            m.getDescription(),
            m.getMachineData(),
            m.getThumbnail(),
            m.isPublic(),
            m.getUser().getId(),
            m.getUser().getUsername(),
            m.getForkedFrom() != null ? m.getForkedFrom().getId() : null,
            m.getCreatedAt(),
            m.getUpdatedAt()
        );
    }
}
