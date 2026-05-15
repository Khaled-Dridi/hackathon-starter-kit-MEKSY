package com.inetum.starter.service;

import com.inetum.starter.auth.PasswordHasher;
import com.inetum.starter.entity.Role;
import com.inetum.starter.entity.UserEntity;
import com.inetum.starter.repository.UserRepository;
import jakarta.enterprise.context.ApplicationScoped;
import jakarta.transaction.Transactional;
import lombok.RequiredArgsConstructor;
import org.jboss.logging.Logger;

import java.util.List;
import java.util.Optional;
import java.util.Set;

@ApplicationScoped
@RequiredArgsConstructor
public class UserService {

    private static final Logger LOG = Logger.getLogger(UserService.class);

    private final UserRepository userRepository;
    private final PasswordHasher passwordHasher;

    public Optional<UserEntity> authenticate(String email, String rawPassword) {
        return userRepository.findByEmail(email)
                .filter(u -> passwordHasher.matches(rawPassword, u.getPasswordHash()));
    }

    public boolean existsByEmail(String email) {
        return userRepository.existsByEmail(email);
    }

    public List<UserEntity> listAll() {
        return userRepository.listAll();
    }

    @Transactional
    public UserEntity create(String email, String rawPassword, Set<Role> roles) {
        var user = new UserEntity();
        user.setEmail(email);
        user.setPasswordHash(passwordHasher.hash(rawPassword));
        user.setRoles(roles);
        userRepository.persist(user);
        LOG.debugf("Created user id=%s email=%s", user.getId(), email);
        return user;
    }
}
