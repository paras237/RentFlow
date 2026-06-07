package com.rentalmanagement.rentalservice.controller;

import com.rentalmanagement.rentalservice.dto.PublicPropertyResponse;
import com.rentalmanagement.rentalservice.dto.PublicUnitResponse;
import com.rentalmanagement.rentalservice.enums.UnitStatus;
import com.rentalmanagement.rentalservice.model.Property;
import com.rentalmanagement.rentalservice.model.RentalApplication;
import com.rentalmanagement.rentalservice.model.Unit;
import com.rentalmanagement.rentalservice.repository.PropertyRepository;
import com.rentalmanagement.rentalservice.repository.RentalApplicationRepository;
import com.rentalmanagement.rentalservice.repository.UnitRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.ArrayList;
import java.util.List;
import java.util.Map;
import java.util.stream.Collectors;

@RestController
@RequestMapping("/api/public")
@RequiredArgsConstructor
@Slf4j
public class PublicController {

    private final PropertyRepository propertyRepository;
    private final UnitRepository unitRepository;
    private final RentalApplicationRepository rentalApplicationRepository;

    @GetMapping("/properties")
    public ResponseEntity<List<PublicPropertyResponse>> getPublicProperties() {
        List<Property> properties = propertyRepository.findAll();
        List<PublicPropertyResponse> responses = new ArrayList<>();

        for (Property p : properties) {
            List<Unit> vacantUnits = p.getUnits().stream()
                    .filter(u -> u.getStatus() == UnitStatus.VACANT)
                    .collect(Collectors.toList());

            if (!vacantUnits.isEmpty()) {
                List<PublicUnitResponse> unitResponses = vacantUnits.stream()
                        .map(u -> PublicUnitResponse.builder()
                                .id(u.getId())
                                .unitNumber(u.getUnitNumber())
                                .baseRent(u.getBaseRent())
                                .build())
                        .collect(Collectors.toList());

                responses.add(PublicPropertyResponse.builder()
                        .id(p.getId())
                        .name(p.getName())
                        .address(p.getAddress())
                        .description(p.getDescription())
                        .imageUrl(p.getImageUrl())
                        .additionalImages(p.getAdditionalImages())
                        .vacantUnits(unitResponses)
                        .build());
            }
        }
        return ResponseEntity.ok(responses);
    }

    @PostMapping("/apply")
    public ResponseEntity<?> submitApplication(@RequestBody RentalApplication request) {
        log.info("Received rental application for unit: {}", request.getUnit().getId());
        
        // Load Property and Unit from DB to verify they exist
        Property property = propertyRepository.findById(request.getProperty().getId())
                .orElseThrow(() -> new IllegalArgumentException("Property not found"));
        Unit unit = unitRepository.findById(request.getUnit().getId())
                .orElseThrow(() -> new IllegalArgumentException("Unit not found"));
                
        if (unit.getStatus() != UnitStatus.VACANT) {
            return ResponseEntity.badRequest().body(Map.of("message", "This unit is no longer vacant."));
        }

        request.setProperty(property);
        request.setUnit(unit);
        rentalApplicationRepository.save(request);

        return ResponseEntity.ok(Map.of("message", "Application submitted successfully"));
    }
}
