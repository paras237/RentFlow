package com.rentalmanagement.rentalservice.dto;

import lombok.Builder;
import lombok.Data;

@Data
@Builder
public class InvoiceItemResponse {
    private Long id;
    private String description;
    private Double amount;
}
