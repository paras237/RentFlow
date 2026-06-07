package com.rentalmanagement.rentalservice.service;

import java.time.LocalDate;
import java.time.LocalDateTime;
import java.time.ZoneId;
import java.util.Date;

import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import com.rentalmanagement.rentalservice.enums.BillingType;
import com.rentalmanagement.rentalservice.dto.InvoiceResponse;
import com.rentalmanagement.rentalservice.model.Invoice;
import com.rentalmanagement.rentalservice.model.Lease;
import com.rentalmanagement.rentalservice.model.Unit;
import com.rentalmanagement.rentalservice.repository.InvoiceRepository;
import com.rentalmanagement.rentalservice.repository.LeaseRepository;
import com.rentalmanagement.rentalservice.repository.UnitRepository;

import lombok.RequiredArgsConstructor;

@Service
@RequiredArgsConstructor
public class InvoiceService {

    private final InvoiceRepository invoiceRepository;
    private final LeaseRepository leaseRepository;
    private final UnitRepository unitRepository;
    private final EmailService emailService;

    @Transactional
    public InvoiceResponse createInvoice(com.rentalmanagement.rentalservice.dto.CreateInvoiceRequest request) {
        Long unitId = request.getUnitId();
        Double currentMeterReading = request.getCurrentMeterReading();
        
        Lease lease = leaseRepository.findByUnitIdAndIsActiveTrue(unitId);

        if (lease == null) {
            throw new RuntimeException("No active lease found for this unit");
        }

        // Guard: prevent duplicate RENT invoice for same billing month.
        // Custom-charge-only invoices (no meter reading, flagged by caller) are always allowed.
        boolean isCustomOnly = (currentMeterReading == null)
                && (request.getCustomItems() != null && !request.getCustomItems().isEmpty());

        if (!isCustomOnly) {
            String billingMonth = java.time.LocalDate.now().toString().substring(0, 7);
            if (invoiceRepository.existsByLeaseUnitIdAndBillingMonth(unitId, billingMonth)) {
                throw new RuntimeException("Rent invoice already generated for " + billingMonth
                        + ". To add extra charges, use 'Charge Tenant' and add only custom charges.");
            }
        }

        Unit unit = lease.getUnit();
        Double rentAmount = unit.getBaseRent();
        Double electricityAmount = 0.0;
        Double totalAmount = 0.0;
        Double usage = 0.0;
        
        Invoice invoice = new Invoice();
        invoice.setLease(lease);

        // 1. Add Base Rent Line Item — skip for custom-charge-only invoices
        if (!isCustomOnly) {
            com.rentalmanagement.rentalservice.model.InvoiceItem rentItem = new com.rentalmanagement.rentalservice.model.InvoiceItem();
            rentItem.setDescription("Base Rent");
            rentItem.setAmount(rentAmount);
            rentItem.setInvoice(invoice);
            invoice.getItems().add(rentItem);
            totalAmount += rentAmount;
        } else {
            rentAmount = 0.0; // custom-only: no rent on this invoice
        }

        // 2. METERED Billing Logic
        if (unit.getBillingType() == BillingType.METERED) {
            if (currentMeterReading != null) {
                Double lastReading = unit.getLastMeterReading() != null ? unit.getLastMeterReading() : 0.0;
                if (currentMeterReading < lastReading) {
                    throw new RuntimeException("Current reading cannot be less than last reading");
                }
                usage = currentMeterReading - lastReading;
                Double rate = unit.getElectricityRate() != null ? unit.getElectricityRate() : 0.0;
                electricityAmount = usage * rate;
                
                if (electricityAmount > 0) {
                    com.rentalmanagement.rentalservice.model.InvoiceItem elecItem = new com.rentalmanagement.rentalservice.model.InvoiceItem();
                    elecItem.setDescription(String.format("Electricity Usage (%.1f units @ ₹%.1f)", usage, rate));
                    elecItem.setAmount(electricityAmount);
                    elecItem.setInvoice(invoice);
                    invoice.getItems().add(elecItem);
                    totalAmount += electricityAmount;
                }

                // Side Effect: Update Unit's last meter reading
                unit.setLastMeterReading(currentMeterReading);
                unitRepository.save(unit);
                
                invoice.setCurrentMeterReading(currentMeterReading);
                invoice.setUsage(usage);
                invoice.setPreviousMeterReading(lastReading);
            } else {
                invoice.setCurrentMeterReading(null);
                invoice.setUsage(null);
                invoice.setPreviousMeterReading(null);
            }
        } else {
            invoice.setCurrentMeterReading(null);
            invoice.setUsage(null);
            invoice.setPreviousMeterReading(null);
        }
        // Add Recurring Charges from Lease — skip for custom-charge-only invoices
        if (!isCustomOnly && lease.getRecurringCharges() != null) {
            for (com.rentalmanagement.rentalservice.model.RecurringCharge rc : lease.getRecurringCharges()) {
                com.rentalmanagement.rentalservice.model.InvoiceItem rcItem = new com.rentalmanagement.rentalservice.model.InvoiceItem();
                rcItem.setDescription(rc.getDescription() != null ? rc.getDescription() : "Recurring Charge");
                rcItem.setAmount(rc.getAmount());
                rcItem.setInvoice(invoice);
                invoice.getItems().add(rcItem);
                totalAmount += rc.getAmount();
            }
        }
        
        // 3. Add Custom Line Items
        if (request.getCustomItems() != null) {
            for (com.rentalmanagement.rentalservice.dto.InvoiceItemRequest itemReq : request.getCustomItems()) {
                if (itemReq.getAmount() != null && itemReq.getAmount() > 0) {
                    com.rentalmanagement.rentalservice.model.InvoiceItem customItem = new com.rentalmanagement.rentalservice.model.InvoiceItem();
                    customItem.setDescription(itemReq.getDescription() != null ? itemReq.getDescription() : "Other Charge");
                    customItem.setAmount(itemReq.getAmount());
                    customItem.setInvoice(invoice);
                    invoice.getItems().add(customItem);
                    totalAmount += itemReq.getAmount();
                }
            }
        }

        // Set standard amounts for backward compatibility
        invoice.setRentAmount(rentAmount);
        invoice.setElectricityAmount(electricityAmount);
        invoice.setTotalAmount(totalAmount);

        invoice.setBillingMonth(LocalDate.now().toString().substring(0, 7)); // YYYY-MM
        invoice.setGeneratedDate(Date.from(LocalDate.now().atStartOfDay(ZoneId.systemDefault()).toInstant()));
        invoice.setCreatedAt(LocalDateTime.now());
        invoice.setStatus("PENDING");

        // Set period and due date
        invoice.setPeriodEnd(LocalDate.now());
        invoice.setPeriodStart(LocalDate.now().minusDays(30));
        invoice.setDueDate(LocalDate.now().plusDays(7));

        Invoice saved = invoiceRepository.save(invoice);

        // Send Email Notification
        if (lease.getTenant() != null && lease.getTenant().getEmail() != null) {
            emailService.sendInvoiceCreatedEmail(lease.getTenant().getEmail(), saved);
        }

        return mapToResponse(saved);
    }

    @Transactional
    public InvoiceResponse updateStatus(Long id, String status) {
        Invoice invoice = invoiceRepository.findById(id)
                .orElseThrow(() -> new RuntimeException("Invoice not found"));
        invoice.setStatus(status.toUpperCase());
        if ("PAID".equalsIgnoreCase(status) && invoice.getPaymentDate() == null) {
            invoice.setPaymentDate(LocalDateTime.now());
        }
        Invoice saved = invoiceRepository.save(invoice);
        return mapToResponse(saved);
    }

    public com.rentalmanagement.rentalservice.dto.InvoiceResponse mapToResponse(Invoice invoice) {
        return com.rentalmanagement.rentalservice.dto.InvoiceResponse.builder()
                .id(invoice.getId())
                .leaseId(invoice.getLease() != null ? invoice.getLease().getId() : null)
                .tenantName(invoice.getLease() != null && invoice.getLease().getTenant() != null
                        ? invoice.getLease().getTenant().getFullName()
                        : "Unknown")
                .unitNumber(invoice.getLease() != null && invoice.getLease().getUnit() != null
                        ? invoice.getLease().getUnit().getUnitNumber()
                        : "Unknown")
                .rentAmount(invoice.getRentAmount())
                .electricityAmount(invoice.getElectricityAmount())
                .totalAmount(invoice.getTotalAmount())
                .currentMeterReading(invoice.getCurrentMeterReading())
                .usage(invoice.getUsage())
                .status(invoice.getStatus())
                .dueDate(invoice.getDueDate())
                .periodStart(invoice.getPeriodStart())
                .periodEnd(invoice.getPeriodEnd())
                .billingMonth(invoice.getBillingMonth())
                .createdAt(invoice.getCreatedAt())
                .items(invoice.getItems() != null ? invoice.getItems().stream()
                    .map(item -> com.rentalmanagement.rentalservice.dto.InvoiceItemResponse.builder()
                        .id(item.getId())
                        .description(item.getDescription())
                        .amount(item.getAmount())
                        .build())
                    .toList() : new java.util.ArrayList<>())
                .build();
    }

    @Transactional
    public void deleteInvoice(Long id) {
        if (!invoiceRepository.existsById(id)) {
            throw new RuntimeException("Invoice not found");
        }
        invoiceRepository.deleteById(id);
    }

    public void resendInvoiceEmail(Long id) {
        Invoice invoice = invoiceRepository.findById(id)
                .orElseThrow(() -> new RuntimeException("Invoice not found"));
        
        if (invoice.getLease() != null && invoice.getLease().getTenant() != null && invoice.getLease().getTenant().getEmail() != null) {
            emailService.sendInvoiceCreatedEmail(invoice.getLease().getTenant().getEmail(), invoice);
        } else {
            throw new RuntimeException("Tenant email not available for this invoice");
        }
    }
}
