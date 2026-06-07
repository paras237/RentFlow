package com.rentalmanagement.rentalservice.service;

import com.rentalmanagement.rentalservice.dto.SystemStatsResponse;
import com.rentalmanagement.rentalservice.repository.OwnerRepository;
import com.rentalmanagement.rentalservice.repository.PropertyRepository;
import com.rentalmanagement.rentalservice.repository.TenantRepository;
import com.rentalmanagement.rentalservice.repository.UnitRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;

@Service
@RequiredArgsConstructor
@Slf4j
public class SuperAdminService {

    private final OwnerRepository ownerRepository;
    private final PropertyRepository propertyRepository;
    private final TenantRepository tenantRepository;
    private final UnitRepository unitRepository;

    public SystemStatsResponse getSystemStats() {
        long totalOwners = ownerRepository.count();
        long totalProperties = propertyRepository.count();
        long totalTenants = tenantRepository.count();
        long totalUnits = unitRepository.count();
        
        // Revenue could be calculated by querying InvoiceRepository for PAID invoices,
        // but for now we keep it simple.
        long totalRevenue = 0; 

        return SystemStatsResponse.builder()
                .totalLandlords(totalOwners)
                .totalProperties(totalProperties)
                .totalTenants(totalTenants)
                .totalUnits(totalUnits)
                .totalRevenue(totalRevenue)
                .build();
    }
}
