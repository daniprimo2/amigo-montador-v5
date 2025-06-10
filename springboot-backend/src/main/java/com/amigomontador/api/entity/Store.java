package com.amigomontador.api.entity;

import jakarta.persistence.*;
import jakarta.validation.constraints.NotBlank;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;
import org.hibernate.annotations.JdbcTypeCode;
import org.hibernate.type.SqlTypes;

import java.util.List;

@Entity
@Table(name = "stores")
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class Store {
    
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;
    
    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "user_id", nullable = false)
    private User user;
    
    @NotBlank
    @Column(nullable = false)
    private String name;
    
    @NotBlank
    @Column(name = "document_type", nullable = false)
    @Enumerated(EnumType.STRING)
    private DocumentType documentType;
    
    @NotBlank
    @Column(name = "document_number", nullable = false)
    private String documentNumber;
    
    @NotBlank
    @Column(nullable = false)
    private String cnpj;
    
    @NotBlank
    @Column(nullable = false)
    private String address;
    
    @NotBlank
    @Column(nullable = false)
    private String city;
    
    @NotBlank
    @Column(nullable = false)
    private String state;
    
    private String phone;
    
    @NotBlank
    @Column(name = "logo_url", nullable = false)
    private String logoUrl;
    
    @JdbcTypeCode(SqlTypes.JSON)
    @Column(name = "material_types", columnDefinition = "jsonb")
    private List<String> materialTypes;
    
    public enum DocumentType {
        cpf, cnpj
    }
}