package com.rentalmanagement.rentalservice.model;

import java.util.List;

import jakarta.persistence.CascadeType;
import jakarta.persistence.Entity;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.JoinColumn;
import jakarta.persistence.ManyToOne;
import jakarta.persistence.OneToMany;
import jakarta.persistence.Table;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

@Entity
@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
@Table(name = "properties")
public class Property {
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    private String name;
    private String address;
    private String imageUrl;

    private String description;
    
    @jakarta.persistence.ElementCollection(fetch = jakarta.persistence.FetchType.LAZY)
    @jakarta.persistence.CollectionTable(name = "property_additional_images", joinColumns = @jakarta.persistence.JoinColumn(name = "property_id"))
    @jakarta.persistence.Column(name = "image_url")
    private List<String> additionalImages = new java.util.ArrayList<>();

    @ManyToOne
    @JoinColumn(name = "owner_id")
    private Owner owner;

    @OneToMany(mappedBy = "property", cascade = CascadeType.ALL)
    private List<Unit> units;
}
