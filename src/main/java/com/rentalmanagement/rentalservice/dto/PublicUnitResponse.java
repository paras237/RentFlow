package com.rentalmanagement.rentalservice.dto;

import lombok.Builder;
import lombok.Data;

@Data
@Builder
public class PublicUnitResponse {
    private Long id;
    private String unitNumber;
    private Double baseRent;
}
