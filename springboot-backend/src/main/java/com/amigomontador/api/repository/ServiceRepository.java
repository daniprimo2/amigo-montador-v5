package com.amigomontador.api.repository;

import com.amigomontador.api.entity.Service;
import com.amigomontador.api.entity.Store;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.util.List;

@Repository
public interface ServiceRepository extends JpaRepository<Service, Long> {
    
    List<Service> findByStoreOrderByCreatedAtDesc(Store store);
    
    @Query("SELECT s FROM Service s WHERE s.status = 'open' AND " +
           "(:specialties IS NULL OR s.materialType IN :specialties) " +
           "ORDER BY s.createdAt DESC")
    List<Service> findAvailableServices(@Param("specialties") List<String> specialties);
    
    @Query("SELECT s FROM Service s WHERE s.store.id = :storeId AND " +
           "(s.ratingRequired = true AND s.bothRatingsCompleted = false)")
    List<Service> findServicesWithPendingRatings(@Param("storeId") Long storeId);
    
    @Query("SELECT DISTINCT s FROM Service s " +
           "JOIN Application a ON s.id = a.service.id " +
           "WHERE s.store.id = :storeId AND a.status = 'pending'")
    List<Service> findServicesWithPendingApplications(@Param("storeId") Long storeId);
}