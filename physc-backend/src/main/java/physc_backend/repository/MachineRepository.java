package physc_backend.repository;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import physc_backend.entity.Machine;

import java.util.List;

public interface MachineRepository extends JpaRepository<Machine, Long> {
    List<Machine> findAllByUserId(Long userId);
    List<Machine> findAllByIsPublicTrue();
    List<Machine> findAllByUserIdAndIsPublicTrue(Long userId);
    List<Machine> findAllByForkedFromId(Long forkedFromId);
    long countByUserIdAndIsPublicTrue(Long userId);

    @Query(value = "SELECT * FROM machines WHERE is_public = 1 AND MATCH(name, description) AGAINST (:query IN BOOLEAN MODE)", nativeQuery = true)
    List<Machine> searchPublicMachines(@Param("query") String query);
}
