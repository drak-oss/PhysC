package physc_backend.dto.response;

import physc_backend.entity.Machine;

import java.time.LocalDateTime;

public record MachineSummaryResponse(
    Long id,
    String name,
    String description,
    String thumbnail,
    boolean isPublic,
    Long ownerId,
    String ownerUsername,
    Long forkedFromId,
    LocalDateTime createdAt,
    LocalDateTime updatedAt
) {
    public static MachineSummaryResponse from(Machine m) {
        return new MachineSummaryResponse(
            m.getId(),
            m.getName(),
            m.getDescription(),
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
