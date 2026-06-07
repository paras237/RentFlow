package com.rentalmanagement.rentalservice.dto;

import java.util.List;
import lombok.Builder;
import lombok.Data;

@Data
@Builder
public class PublicPropertyResponse {
    private Long id;
    private String name;
    private String address;
    private String imageUrl;
    private String description;
    private List<String> additionalImages;
    private List<PublicUnitResponse> vacantUnits;
}
