package com.rentalmanagement.rentalservice.repository;

import java.util.List;
import java.util.Optional;

import org.springframework.data.jpa.repository.JpaRepository;

import com.rentalmanagement.rentalservice.model.Owner;
import com.rentalmanagement.rentalservice.model.Property;

public interface PropertyRepository extends JpaRepository<Property, Long> {
    List<Property> findAllByOwner(Owner owner);
    List<Property> findAllByOwnerId(Long ownerId);

    int countByOwner(Owner owner);
    int countByOwnerId(Long ownerId);

    Optional<Property> findByIdAndOwnerId(Long id, Long ownerId);
}
