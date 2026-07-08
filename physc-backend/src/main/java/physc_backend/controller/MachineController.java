package physc_backend.controller;

import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.*;
import physc_backend.dto.request.SaveMachineRequest;
import physc_backend.dto.response.MachineResponse;
import physc_backend.dto.response.MachineSummaryResponse;
import physc_backend.service.MachineService;

import java.util.List;

@RestController
@RequestMapping("/api/machines")
@RequiredArgsConstructor
public class MachineController {

    private final MachineService machineService;

    @PostMapping
    public ResponseEntity<MachineResponse> save(Authentication auth,
                                                @Valid @RequestBody SaveMachineRequest req) {
        return ResponseEntity.status(HttpStatus.CREATED).body(machineService.save(userId(auth), req));
    }

    @GetMapping("/my")
    public ResponseEntity<List<MachineSummaryResponse>> listMy(Authentication auth) {
        return ResponseEntity.ok(machineService.listMy(userId(auth)));
    }

    @GetMapping("/public")
    public ResponseEntity<List<MachineSummaryResponse>> listPublic() {
        return ResponseEntity.ok(machineService.listPublic());
    }

    @GetMapping("/user/{username}")
    public ResponseEntity<List<MachineSummaryResponse>> listByUser(@PathVariable String username) {
        return ResponseEntity.ok(machineService.listPublicByUsername(username));
    }

    @GetMapping("/search")
    public ResponseEntity<List<MachineSummaryResponse>> search(@RequestParam String q) {
        return ResponseEntity.ok(machineService.search(q));
    }

    @GetMapping("/{id}")
    public ResponseEntity<MachineResponse> get(Authentication auth, @PathVariable Long id) {
        return ResponseEntity.ok(machineService.get(id, userId(auth)));
    }

    @PutMapping("/{id}")
    public ResponseEntity<MachineResponse> update(Authentication auth,
                                                   @PathVariable Long id,
                                                   @Valid @RequestBody SaveMachineRequest req) {
        return ResponseEntity.ok(machineService.update(id, userId(auth), req));
    }

    @DeleteMapping("/{id}")
    public ResponseEntity<Void> delete(Authentication auth, @PathVariable Long id) {
        machineService.delete(id, userId(auth));
        return ResponseEntity.noContent().build();
    }

    @PostMapping("/{id}/fork")
    public ResponseEntity<MachineResponse> fork(Authentication auth, @PathVariable Long id) {
        return ResponseEntity.status(HttpStatus.CREATED).body(machineService.fork(id, userId(auth)));
    }

    private Long userId(Authentication auth) {
        return (Long) auth.getPrincipal();
    }
}
