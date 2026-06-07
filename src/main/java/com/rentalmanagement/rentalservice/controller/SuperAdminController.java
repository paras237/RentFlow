package com.rentalmanagement.rentalservice.controller;

import com.rentalmanagement.rentalservice.dto.SystemStatsResponse;
import com.rentalmanagement.rentalservice.service.SuperAdminService;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/admin")
@RequiredArgsConstructor
@Slf4j
public class SuperAdminController {

    private final SuperAdminService superAdminService;

    @GetMapping("/stats")
    @PreAuthorize("hasAuthority('ROLE_SUPER_ADMIN')")
    public ResponseEntity<SystemStatsResponse> getSystemStats() {
        log.info("Super Admin requesting system stats");
        return ResponseEntity.ok(superAdminService.getSystemStats());
    }
}
