package com.rentalmanagement.rentalservice.dto;

import lombok.Builder;
import lombok.Data;

@Data
@Builder
public class SystemStatsResponse {
    private long totalLandlords;
    private long totalProperties;
    private long totalTenants;
    private long totalUnits;
    private long totalRevenue;
}
