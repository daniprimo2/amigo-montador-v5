package com.amigomontador.api.controller;

import com.amigomontador.api.dto.ServiceDTO;
import com.amigomontador.api.entity.Service;
import com.amigomontador.api.service.ServiceService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/services")
@RequiredArgsConstructor
@Tag(name = "Services", description = "Endpoints para gestão de serviços")
public class ServiceController {
    
    private final ServiceService serviceService;
    
    @GetMapping
    @Operation(summary = "Listar serviços", description = "Lista serviços com paginação")
    public ResponseEntity<Page<ServiceDTO>> getAllServices(
            Pageable pageable,
            @RequestParam(required = false) String status,
            @RequestParam(required = false) String materialType
    ) {
        Page<ServiceDTO> services = serviceService.getAllServices(pageable, status, materialType);
        return ResponseEntity.ok(services);
    }
    
    @GetMapping("/available")
    @Operation(summary = "Serviços disponíveis", description = "Lista serviços disponíveis para montadores")
    public ResponseEntity<List<ServiceDTO>> getAvailableServices(
            Authentication authentication,
            @RequestParam(required = false) List<String> specialties
    ) {
        List<ServiceDTO> services = serviceService.getAvailableServices(specialties);
        return ResponseEntity.ok(services);
    }
    
    @GetMapping("/store/{storeId}")
    @Operation(summary = "Serviços da loja", description = "Lista serviços de uma loja específica")
    public ResponseEntity<List<ServiceDTO>> getServicesByStore(
            @PathVariable Long storeId,
            Authentication authentication
    ) {
        List<ServiceDTO> services = serviceService.getServicesByStore(storeId);
        return ResponseEntity.ok(services);
    }
    
    @GetMapping("/{id}")
    @Operation(summary = "Buscar serviço", description = "Busca serviço por ID")
    public ResponseEntity<ServiceDTO> getService(@PathVariable Long id) {
        ServiceDTO service = serviceService.getServiceById(id);
        return ResponseEntity.ok(service);
    }
    
    @PostMapping
    @Operation(summary = "Criar serviço", description = "Cria novo serviço")
    public ResponseEntity<ServiceDTO> createService(
            @Valid @RequestBody ServiceDTO serviceDTO,
            Authentication authentication
    ) {
        ServiceDTO createdService = serviceService.createService(serviceDTO, authentication.getName());
        return ResponseEntity.ok(createdService);
    }
    
    @PutMapping("/{id}")
    @Operation(summary = "Atualizar serviço", description = "Atualiza serviço existente")
    public ResponseEntity<ServiceDTO> updateService(
            @PathVariable Long id,
            @Valid @RequestBody ServiceDTO serviceDTO,
            Authentication authentication
    ) {
        ServiceDTO updatedService = serviceService.updateService(id, serviceDTO, authentication.getName());
        return ResponseEntity.ok(updatedService);
    }
    
    @DeleteMapping("/{id}")
    @Operation(summary = "Deletar serviço", description = "Remove serviço do sistema")
    public ResponseEntity<Map<String, String>> deleteService(
            @PathVariable Long id,
            Authentication authentication
    ) {
        serviceService.deleteService(id, authentication.getName());
        return ResponseEntity.ok(Map.of("message", "Serviço removido com sucesso"));
    }
    
    @GetMapping("/pending-evaluations")
    @Operation(summary = "Serviços com avaliações pendentes", description = "Lista serviços que requerem avaliação")
    public ResponseEntity<Map<String, Boolean>> getPendingEvaluations(Authentication authentication) {
        boolean hasPending = serviceService.hasPendingEvaluations(authentication.getName());
        return ResponseEntity.ok(Map.of("hasPendingEvaluations", hasPending));
    }
    
    @PostMapping("/{id}/complete")
    @Operation(summary = "Marcar serviço como concluído", description = "Finaliza um serviço")
    public ResponseEntity<ServiceDTO> completeService(
            @PathVariable Long id,
            Authentication authentication
    ) {
        ServiceDTO service = serviceService.completeService(id, authentication.getName());
        return ResponseEntity.ok(service);
    }
}