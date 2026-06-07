package com.rentalmanagement.rentalservice.repository;

import com.rentalmanagement.rentalservice.model.RentalApplication;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;

@Repository
public interface RentalApplicationRepository extends JpaRepository<RentalApplication, Long> {
    List<RentalApplication> findByProperty_OwnerId(Long ownerId);
    List<RentalApplication> findByPropertyId(Long propertyId);
}
