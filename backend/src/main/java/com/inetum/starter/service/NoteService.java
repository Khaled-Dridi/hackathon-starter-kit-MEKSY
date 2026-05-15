package com.inetum.starter.service;

import com.inetum.starter.entity.NoteEntity;
import com.inetum.starter.exception.ResourceNotFoundException;
import com.inetum.starter.repository.NoteRepository;
import jakarta.enterprise.context.ApplicationScoped;
import jakarta.transaction.Transactional;
import lombok.RequiredArgsConstructor;
import org.jboss.logging.Logger;

import java.util.List;

@ApplicationScoped
@RequiredArgsConstructor
public class NoteService {

    private static final Logger LOG = Logger.getLogger(NoteService.class);

    private final NoteRepository noteRepository;

    public List<NoteEntity> listForUser(Long userId) {
        return noteRepository.listByUser(userId);
    }

    public NoteEntity getOwned(Long id, Long userId) {
        return noteRepository.findByIdAndUser(id, userId)
                .orElseThrow(() -> new ResourceNotFoundException("Note not found"));
    }

    @Transactional
    public NoteEntity create(Long userId, String title, String content) {
        var note = new NoteEntity();
        note.setUserId(userId);
        note.setTitle(title);
        note.setContent(content == null ? "" : content);
        noteRepository.persist(note);
        LOG.debugf("Note created id=%s userId=%s", note.getId(), userId);
        return note;
    }

    @Transactional
    public NoteEntity update(Long id, Long userId, String title, String content) {
        var note = getOwned(id, userId);
        note.setTitle(title);
        note.setContent(content == null ? "" : content);
        return note;
    }

    @Transactional
    public void delete(Long id, Long userId) {
        var note = getOwned(id, userId);
        noteRepository.delete(note);
        LOG.debugf("Note deleted id=%s userId=%s", id, userId);
    }
}
