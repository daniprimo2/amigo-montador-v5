package com.amigomontador.api.controller;

import com.amigomontador.api.dto.LoginRequestDTO;
import com.amigomontador.api.dto.UserDTO;
import com.amigomontador.api.entity.User;
import com.amigomontador.api.security.JwtUtil;
import com.amigomontador.api.service.UserService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.authentication.AuthenticationManager;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.*;

import java.util.Map;

@RestController
@RequestMapping("/auth")
@RequiredArgsConstructor
@Tag(name = "Authentication", description = "Endpoints para autenticação de usuários")
public class AuthController {
    
    private final AuthenticationManager authenticationManager;
    private final UserService userService;
    private final JwtUtil jwtUtil;
    
    @PostMapping("/login")
    @Operation(summary = "Login do usuário", description = "Autentica usuário e retorna token JWT")
    public ResponseEntity<?> login(@Valid @RequestBody LoginRequestDTO loginRequest) {
        try {
            Authentication authentication = authenticationManager.authenticate(
                new UsernamePasswordAuthenticationToken(
                    loginRequest.getUsername(),
                    loginRequest.getPassword()
                )
            );
            
            User user = userService.findByUsername(loginRequest.getUsername());
            String token = jwtUtil.generateToken(
                user.getUsername(),
                user.getId(),
                user.getUserType().toString()
            );
            
            UserDTO userDTO = UserDTO.builder()
                .id(user.getId())
                .username(user.getUsername())
                .name(user.getName())
                .email(user.getEmail())
                .phone(user.getPhone())
                .userType(user.getUserType())
                .profilePhotoUrl(user.getProfilePhotoUrl())
                .profileData(user.getProfileData())
                .createdAt(user.getCreatedAt())
                .build();
            
            return ResponseEntity.ok(Map.of(
                "token", token,
                "user", userDTO
            ));
            
        } catch (Exception e) {
            return ResponseEntity.badRequest()
                .body(Map.of("error", "Credenciais inválidas"));
        }
    }
    
    @PostMapping("/register")
    @Operation(summary = "Registro de usuário", description = "Registra novo usuário no sistema")
    public ResponseEntity<?> register(@Valid @RequestBody UserDTO userDTO) {
        try {
            User user = userService.createUser(userDTO);
            String token = jwtUtil.generateToken(
                user.getUsername(),
                user.getId(),
                user.getUserType().toString()
            );
            
            UserDTO responseDTO = UserDTO.builder()
                .id(user.getId())
                .username(user.getUsername())
                .name(user.getName())
                .email(user.getEmail())
                .phone(user.getPhone())
                .userType(user.getUserType())
                .profilePhotoUrl(user.getProfilePhotoUrl())
                .profileData(user.getProfileData())
                .createdAt(user.getCreatedAt())
                .build();
            
            return ResponseEntity.ok(Map.of(
                "token", token,
                "user", responseDTO
            ));
            
        } catch (Exception e) {
            return ResponseEntity.badRequest()
                .body(Map.of("error", e.getMessage()));
        }
    }
    
    @GetMapping("/validate")
    @Operation(summary = "Validar token", description = "Valida token JWT e retorna dados do usuário")
    public ResponseEntity<?> validateToken(@RequestHeader("Authorization") String authHeader) {
        try {
            String token = authHeader.replace("Bearer ", "");
            
            if (jwtUtil.isTokenValid(token)) {
                String username = jwtUtil.extractUsername(token);
                User user = userService.findByUsername(username);
                
                UserDTO userDTO = UserDTO.builder()
                    .id(user.getId())
                    .username(user.getUsername())
                    .name(user.getName())
                    .email(user.getEmail())
                    .phone(user.getPhone())
                    .userType(user.getUserType())
                    .profilePhotoUrl(user.getProfilePhotoUrl())
                    .profileData(user.getProfileData())
                    .createdAt(user.getCreatedAt())
                    .build();
                
                return ResponseEntity.ok(userDTO);
            }
            
            return ResponseEntity.status(401)
                .body(Map.of("error", "Token inválido"));
            
        } catch (Exception e) {
            return ResponseEntity.status(401)
                .body(Map.of("error", "Token inválido"));
        }
    }
}