package physc_backend.service;

import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import physc_backend.dto.request.SaveMachineRequest;
import physc_backend.dto.response.MachineResponse;
import physc_backend.dto.response.MachineSummaryResponse;
import physc_backend.entity.Machine;
import physc_backend.entity.User;
import physc_backend.exception.ResourceNotFoundException;
import physc_backend.exception.UnauthorizedException;
import physc_backend.repository.MachineRepository;
import physc_backend.repository.UserRepository;

import java.util.Arrays;
import java.util.List;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
@Transactional(readOnly = true)
public class MachineService {

    private final MachineRepository machineRepository;
    private final UserRepository userRepository;

    @Transactional
    public MachineResponse save(Long userId, SaveMachineRequest req) {
        User owner = findUser(userId);
        Machine machine = Machine.builder()
            .user(owner)
            .name(req.name())
            .description(req.description())
            .machineData(req.machineData())
            .thumbnail(req.thumbnail())
            .isPublic(req.isPublic())
            .build();
        return MachineResponse.from(machineRepository.save(machine));
    }

    public MachineResponse get(Long machineId, Long currentUserId) {
        Machine machine = findMachine(machineId);
        if (!machine.isPublic() && !machine.getUser().getId().equals(currentUserId)) {
            throw new UnauthorizedException("This machine is private");
        }
        return MachineResponse.from(machine);
    }

    @Transactional
    public MachineResponse update(Long machineId, Long userId, SaveMachineRequest req) {
        Machine machine = findMachine(machineId);
        if (!machine.getUser().getId().equals(userId)) {
            throw new UnauthorizedException("You do not own this machine");
        }
        machine.setName(req.name());
        machine.setDescription(req.description());
        machine.setMachineData(req.machineData());
        machine.setThumbnail(req.thumbnail());
        machine.setPublic(req.isPublic());
        return MachineResponse.from(machineRepository.save(machine));
    }

    @Transactional
    public void delete(Long machineId, Long userId) {
        Machine machine = findMachine(machineId);
        if (!machine.getUser().getId().equals(userId)) {
            throw new UnauthorizedException("You do not own this machine");
        }
        machineRepository.delete(machine);
    }

    public List<MachineSummaryResponse> listMy(Long userId) {
        return machineRepository.findAllByUserId(userId)
            .stream()
            .map(MachineSummaryResponse::from)
            .toList();
    }

    public List<MachineSummaryResponse> listPublic() {
        return machineRepository.findAllByIsPublicTrue()
            .stream()
            .map(MachineSummaryResponse::from)
            .toList();
    }

    public List<MachineSummaryResponse> listPublicByUsername(String username) {
        User user = userRepository.findByUsername(username)
            .orElseThrow(() -> new ResourceNotFoundException("User not found: " + username));
        return machineRepository.findAllByUserIdAndIsPublicTrue(user.getId())
            .stream()
            .map(MachineSummaryResponse::from)
            .toList();
    }

    public List<MachineSummaryResponse> search(String query) {
        if (query == null || query.trim().length() < 2) {
            return List.of();
        }
        String fulltextQuery = Arrays.stream(query.trim().split("\\s+"))
            .map(word -> word + "*")
            .collect(Collectors.joining(" "));
        return machineRepository.searchPublicMachines(fulltextQuery)
            .stream()
            .map(MachineSummaryResponse::from)
            .toList();
    }

    @Transactional
    public MachineResponse fork(Long sourceId, Long userId) {
        Machine source = findMachine(sourceId);

        if (!source.isPublic() && !source.getUser().getId().equals(userId)) {
            throw new UnauthorizedException("Cannot fork a private machine");
        }

        User owner = findUser(userId);
        Machine forked = Machine.builder()
            .user(owner)
            .forkedFrom(source)
            .name(source.getName())
            .description(source.getDescription())
            .machineData(source.getMachineData())
            .thumbnail(source.getThumbnail())
            .isPublic(false)
            .build();

        return MachineResponse.from(machineRepository.save(forked));
    }

    private Machine findMachine(Long id) {
        return machineRepository.findById(id)
            .orElseThrow(() -> new ResourceNotFoundException("Machine not found"));
    }

    private User findUser(Long id) {
        return userRepository.findById(id)
            .orElseThrow(() -> new ResourceNotFoundException("User not found"));
    }
}
