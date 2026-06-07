package com.rentalmanagement.rentalservice.service;

import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;
import java.util.stream.Collectors;

import com.rentalmanagement.rentalservice.dto.PropertyDTO;
import com.rentalmanagement.rentalservice.dto.PropertyResponse;
import com.rentalmanagement.rentalservice.model.Owner;
import com.rentalmanagement.rentalservice.model.Property;
import com.rentalmanagement.rentalservice.repository.PropertyRepository;
import org.springframework.web.multipart.MultipartFile;

import lombok.RequiredArgsConstructor;

@Service
@RequiredArgsConstructor
public class PropertyService {

    private final PropertyRepository propertyRepository;
    private final CloudinaryService cloudinaryService;

    @Transactional
    public PropertyResponse createProperty(PropertyDTO dto, java.util.List<MultipartFile> files, Owner owner) {
        String imageUrl = null;
        java.util.List<String> additionalImages = new java.util.ArrayList<>();
        
        if (files != null && !files.isEmpty()) {
            for (int i = 0; i < files.size(); i++) {
                MultipartFile file = files.get(i);
                if (file != null && !file.isEmpty()) {
                    String url = cloudinaryService.uploadFile(file, "properties");
                    if (imageUrl == null) {
                        imageUrl = url;
                    } else {
                        additionalImages.add(url);
                    }
                }
            }
        }

        Property property = Property.builder()
                .name(dto.getName())
                .address(dto.getAddress())
                .description(dto.getDescription())
                .owner(owner)
                .imageUrl(imageUrl)
                .additionalImages(additionalImages)
                .build();
        Property saved = propertyRepository.save(property);
        return mapToResponse(saved);
    }

    public List<PropertyResponse> getAllProperties(Owner owner) {
        return propertyRepository.findAllByOwnerId(owner.getEffectiveOwnerId()).stream()
                .map(this::mapToResponse)
                .collect(Collectors.toList());
    }

    public PropertyResponse getProperty(Long id, Owner owner) {
        Property property = propertyRepository.findById(id)
                .filter(p -> p.getOwner().getId().equals(owner.getEffectiveOwnerId()))
                .orElseThrow(() -> new RuntimeException("Property not found or access denied"));
        return mapToResponse(property);
    }

    @Transactional
    public void deleteProperty(Long id, Owner owner) {
        Property property = propertyRepository.findById(id)
                .filter(p -> p.getOwner().getId().equals(owner.getEffectiveOwnerId()))
                .orElseThrow(() -> new RuntimeException("Property not found or access denied"));
        propertyRepository.delete(property);
    }

    @Transactional
    public PropertyResponse updateProperty(Long id, PropertyDTO dto, java.util.List<MultipartFile> files, Owner owner) {
        Property property = propertyRepository.findById(id)
                .filter(p -> p.getOwner().getId().equals(owner.getEffectiveOwnerId()))
                .orElseThrow(() -> new RuntimeException("Property not found or access denied"));

        property.setName(dto.getName());
        property.setAddress(dto.getAddress());
        property.setDescription(dto.getDescription());

        if (files != null && !files.isEmpty()) {
            String imageUrl = null;
            java.util.List<String> additionalImages = new java.util.ArrayList<>();
            
            for (int i = 0; i < files.size(); i++) {
                MultipartFile file = files.get(i);
                if (file != null && !file.isEmpty()) {
                    String url = cloudinaryService.uploadFile(file, "properties");
                    if (imageUrl == null) {
                        imageUrl = url;
                    } else {
                        additionalImages.add(url);
                    }
                }
            }
            
            // Only replace images if new files were actually uploaded
            if (imageUrl != null) {
                property.setImageUrl(imageUrl);
                property.setAdditionalImages(additionalImages);
            }
        }

        Property updated = propertyRepository.save(property);
        return mapToResponse(updated);
    }

    private PropertyResponse mapToResponse(Property property) {
        return PropertyResponse.builder()
                .id(property.getId())
                .name(property.getName())
                .address(property.getAddress())
                .description(property.getDescription())
                .ownerId(property.getOwner().getPublicId())
                .imageUrl(property.getImageUrl())
                .additionalImages(property.getAdditionalImages())
                .build();
    }
}
