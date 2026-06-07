package com.rentalmanagement.rentalservice.controller;

import java.util.List;

import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import com.rentalmanagement.rentalservice.dto.CreateInvoiceRequest;
import com.rentalmanagement.rentalservice.dto.InvoiceResponse;
import com.rentalmanagement.rentalservice.model.Invoice;
import com.rentalmanagement.rentalservice.repository.InvoiceRepository;
import com.rentalmanagement.rentalservice.service.InvoiceService;

import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;

@RestController
@RequestMapping("/api/invoices")
@RequiredArgsConstructor
public class InvoiceController {

    private final InvoiceService invoiceService;
    private final InvoiceRepository invoiceRepository;

    @PostMapping("/generate")
    public ResponseEntity<InvoiceResponse> createInvoice(@Valid @RequestBody CreateInvoiceRequest request) {
        InvoiceResponse invoice = invoiceService.createInvoice(request);
        return ResponseEntity.ok(invoice);
    }

    @GetMapping("/lease/{leaseId}")
    public ResponseEntity<List<InvoiceResponse>> getInvoicesByLease(@PathVariable Long leaseId) {
        List<Invoice> invoices = invoiceRepository.findByLeaseId(leaseId);
        List<InvoiceResponse> responses = invoices.stream()
                .map(invoiceService::mapToResponse)
                .toList();
        return ResponseEntity.ok(responses);
    }

    @GetMapping("/unit/{unitId}")
    public ResponseEntity<List<InvoiceResponse>> getInvoicesByUnit(@PathVariable Long unitId) {
        List<Invoice> invoices = invoiceRepository.findByLeaseUnitId(unitId);
        List<InvoiceResponse> responses = invoices.stream()
                .map(invoiceService::mapToResponse)
                .toList();
        return ResponseEntity.ok(responses);
    }

    @org.springframework.web.bind.annotation.PutMapping("/{id}/status")
    public ResponseEntity<InvoiceResponse> updateStatus(
            @PathVariable Long id,
            @RequestBody java.util.Map<String, String> payload) {
        String status = payload.get("status");
        if (status == null || status.isBlank()) {
            return ResponseEntity.badRequest().build();
        }
        return ResponseEntity.ok(invoiceService.updateStatus(id, status));
    }

    @org.springframework.web.bind.annotation.DeleteMapping("/{id}")
    public ResponseEntity<Void> deleteInvoice(@PathVariable Long id) {
        invoiceService.deleteInvoice(id);
        return ResponseEntity.noContent().build();
    }

    @PostMapping("/{id}/resend")
    public ResponseEntity<Void> resendInvoiceEmail(@PathVariable Long id) {
        invoiceService.resendInvoiceEmail(id);
        return ResponseEntity.ok().build();
    }
}
