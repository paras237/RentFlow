package com.rentalmanagement.rentalservice.controller;

import com.rentalmanagement.rentalservice.model.Owner;
import com.rentalmanagement.rentalservice.repository.OwnerRepository;
import com.rentalmanagement.rentalservice.security.RoleConstants;
import com.rentalmanagement.rentalservice.service.EmailService;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.Map;
import java.util.UUID;
import java.util.stream.Collectors;

@RestController
@RequestMapping("/api/owner/agents")
@RequiredArgsConstructor
@Slf4j
public class AgentController {

    private final OwnerRepository ownerRepository;
    private final PasswordEncoder passwordEncoder;
    private final EmailService emailService;

    @GetMapping
    @PreAuthorize("hasRole('OWNER')")
    public ResponseEntity<List<Map<String, Object>>> getAgents(@AuthenticationPrincipal Owner owner) {
        log.info("Fetching agents for owner: {}", owner.getEmail());
        // An agent has this owner's ID as their parentOwnerId
        List<Owner> agents = ownerRepository.findByParentOwnerId(owner.getId());
        
        List<Map<String, Object>> response = agents.stream()
                .map(a -> Map.of(
                        "id", (Object) a.getId(),
                        "username", a.getUsername(),
                        "email", a.getEmail(),
                        "role", a.getRole(),
                        "isVerified", a.isVerified()
                ))
                .collect(Collectors.toList());
                
        return ResponseEntity.ok(response);
    }

    @PostMapping
    @PreAuthorize("hasRole('OWNER')")
    public ResponseEntity<?> inviteAgent(@RequestBody Map<String, String> request, @AuthenticationPrincipal Owner owner) {
        String email = request.get("email");
        String username = request.get("username");
        
        if (ownerRepository.existsByEmail(email)) {
            return ResponseEntity.badRequest().body(Map.of("error", "Email is already registered."));
        }

        // Generate a random default password for the agent. They should change it later.
        String randomPassword = UUID.randomUUID().toString().substring(0, 8);
        
        Owner newAgent = Owner.builder()
                .publicId(UUID.randomUUID().toString())
                .email(email)
                .username(username)
                .password(passwordEncoder.encode(randomPassword))
                .role(RoleConstants.ROLE_AGENT)
                .parentOwnerId(owner.getId())
                .isVerified(true) // Agents invited by an owner can be verified instantly, or require standard email flow. We assume instant for now.
                .build();
                
        ownerRepository.save(newAgent);
        
        // In a real app we'd email them their temporary password: randomPassword
        log.info("Created agent {} with temporary password: {}", email, randomPassword);
        emailService.sendAgentInviteEmail(email, username, randomPassword);

        return ResponseEntity.ok(Map.of("message", "Agent invited successfully", "tempPassword", randomPassword));
    }
    
    @DeleteMapping("/{id}")
    @PreAuthorize("hasRole('OWNER')")
    public ResponseEntity<?> removeAgent(@PathVariable Long id, @AuthenticationPrincipal Owner owner) {
        Owner agent = ownerRepository.findById(id)
                .orElseThrow(() -> new IllegalArgumentException("Agent not found"));
                
        if (!owner.getId().equals(agent.getParentOwnerId())) {
            return ResponseEntity.status(403).body(Map.of("error", "Unauthorized to remove this agent"));
        }
        
        ownerRepository.delete(agent);
        return ResponseEntity.ok(Map.of("message", "Agent removed successfully"));
    }
}
