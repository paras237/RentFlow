package com.rentalmanagement.rentalservice.controller;

import com.rentalmanagement.rentalservice.enums.ApplicationStatus;
import com.rentalmanagement.rentalservice.model.Owner;
import com.rentalmanagement.rentalservice.model.RentalApplication;
import com.rentalmanagement.rentalservice.repository.RentalApplicationRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/api/owner/applications")
@RequiredArgsConstructor
@Slf4j
public class ApplicationController {

    private final RentalApplicationRepository rentalApplicationRepository;

    @GetMapping
    @PreAuthorize("hasAnyRole('OWNER', 'AGENT')")
    public ResponseEntity<List<RentalApplication>> getApplications(@AuthenticationPrincipal Owner owner) {
        log.info("Fetching applications for owner: {}", owner.getEmail());
        // In a real app we'd fetch only applications for properties owned by this owner
        // Since we are moving towards Multi-owner, let's assume property.owner == owner
        // For simplicity right now, assuming RentalApplicationRepository.findByProperty_OwnerId is used.
        List<RentalApplication> applications = rentalApplicationRepository.findByProperty_OwnerId(owner.getEffectiveOwnerId());
        return ResponseEntity.ok(applications);
    }

    @PutMapping("/{id}/status")
    @PreAuthorize("hasAnyRole('OWNER', 'AGENT')")
    public ResponseEntity<?> updateStatus(@PathVariable Long id, @RequestBody Map<String, String> body, @AuthenticationPrincipal Owner owner) {
        String statusStr = body.get("status");
        ApplicationStatus status = ApplicationStatus.valueOf(statusStr.toUpperCase());
        
        RentalApplication application = rentalApplicationRepository.findById(id)
                .orElseThrow(() -> new IllegalArgumentException("Application not found"));
                
        // Verify ownership (simplified)
        if (!application.getProperty().getOwner().getId().equals(owner.getEffectiveOwnerId())) {
            return ResponseEntity.status(403).body(Map.of("error", "Not authorized"));
        }

        application.setStatus(status);
        rentalApplicationRepository.save(application);

        // If APPROVED, in a complete flow we'd auto-generate a Lease and Tenant.
        // For now, updating the status is the primary action.

        return ResponseEntity.ok(Map.of("message", "Application status updated to " + status));
    }
}
