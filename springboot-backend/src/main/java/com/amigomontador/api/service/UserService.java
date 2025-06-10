package com.amigomontador.api.service;

import com.amigomontador.api.dto.UserDTO;
import com.amigomontador.api.entity.User;
import com.amigomontador.api.repository.UserRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
@RequiredArgsConstructor
@Transactional
public class UserService {
    
    private final UserRepository userRepository;
    private final PasswordEncoder passwordEncoder;
    
    public User findByUsername(String username) {
        return userRepository.findByUsername(username)
            .orElseThrow(() -> new RuntimeException("Usuário não encontrado: " + username));
    }
    
    public User findById(Long id) {
        return userRepository.findById(id)
            .orElseThrow(() -> new RuntimeException("Usuário não encontrado: " + id));
    }
    
    public User createUser(UserDTO userDTO) {
        // Validar se username já existe
        if (userRepository.existsByUsername(userDTO.getUsername())) {
            throw new RuntimeException("Username já existe: " + userDTO.getUsername());
        }
        
        // Validar se email já existe
        if (userRepository.existsByEmail(userDTO.getEmail())) {
            throw new RuntimeException("Email já existe: " + userDTO.getEmail());
        }
        
        User user = User.builder()
            .username(userDTO.getUsername())
            .password(passwordEncoder.encode(userDTO.getUsername())) // Usando username como senha temporária
            .name(userDTO.getName())
            .email(userDTO.getEmail())
            .phone(userDTO.getPhone())
            .userType(userDTO.getUserType())
            .profilePhotoUrl(userDTO.getProfilePhotoUrl())
            .profileData(userDTO.getProfileData())
            .build();
        
        return userRepository.save(user);
    }
    
    public User updateUser(Long id, UserDTO userDTO) {
        User user = findById(id);
        
        user.setName(userDTO.getName());
        user.setEmail(userDTO.getEmail());
        user.setPhone(userDTO.getPhone());
        user.setProfilePhotoUrl(userDTO.getProfilePhotoUrl());
        user.setProfileData(userDTO.getProfileData());
        
        return userRepository.save(user);
    }
    
    public boolean validatePassword(String username, String password) {
        User user = findByUsername(username);
        return passwordEncoder.matches(password, user.getPassword());
    }
}