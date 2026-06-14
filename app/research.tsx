import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TextInput,
  Pressable,
  Alert,
  Linking,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useSkillGridStore } from '../src/store/skillTreeStore';
import { Colors, Typography, Radii } from '../src/constants/theme';
import type { ResearchProject, Source, CitationStyle } from '../src/types';

const STATUS_COLORS: Record<string, string> = {
  planning: Colors.textDim,
  in_progress: Colors.tierFoundation,
  completed: Colors.tierIntermediate,
};

const CITATION_STYLES: CitationStyle[] = ['APA', 'MLA', 'Chicago', 'Harvard', 'IEEE'];

export default function ResearchScreen() {
  const {
    researchProjects, addResearchProject, updateResearchProject,
    deleteResearchProject, addResearchSource, updateResearchSource, deleteResearchSource,
    addResearchNote, updateResearchNote, deleteResearchNote,
    setActiveResearchProject, activeResearchProject,
  } = useSkillGridStore();
  
  // Main UI state
  const [showNewProject, setShowNewProject] = useState(false);
  const [newProjectTitle, setNewProjectTitle] = useState('');
  const [newProjectDesc, setNewProjectDesc] = useState('');
  
  // Active project view state
  const [activeTab, setActiveTab] = useState<'notes' | 'sources' | 'summary'>('notes');
  
  // Source modal state
  const [showAddSource, setShowAddSource] = useState(false);
  const [editingSource, setEditingSource] = useState<Source | null>(null);
  const [sourceTitle, setSourceTitle] = useState('');
  const [sourceAuthors, setSourceAuthors] = useState('');
  const [sourceUrl, setSourceUrl] = useState('');
  const [sourcePublication, setSourcePublication] = useState('');
  const [sourceYear, setSourceYear] = useState('');
  const [sourceStyle, setSourceStyle] = useState<CitationStyle>('APA');
  const [sourceCitation, setSourceCitation] = useState('');
  const [sourceNotes, setSourceNotes] = useState('');
  
  // Note modal state (keep existing)
  const [showAddNote, setShowAddNote] = useState(false);
  const [newNoteTitle, setNewNoteTitle] = useState('');
  const [newNoteContent, setNewNoteContent] = useState('');

  const activeProject = researchProjects.find((p) => p.id === activeResearchProject);

  const resetSourceForm = () => {
    setEditingSource(null);
    setSourceTitle('');
    setSourceAuthors('');
    setSourceUrl('');
    setSourcePublication('');
    setSourceYear('');
    setSourceStyle('APA');
    setSourceCitation('');
    setSourceNotes('');
  };

  const openSourceForm = (source?: Source) => {
    if (source) {
      setEditingSource(source);
      setSourceTitle(source.title);
      setSourceAuthors(source.authors || '');
      setSourceUrl(source.url || '');
      setSourcePublication(source.publication || '');
      setSourceYear(source.year?.toString() || '');
      setSourceStyle(source.style);
      setSourceCitation(source.citation);
      setSourceNotes(source.notes || '');
    } else {
      resetSourceForm();
    }
    setShowAddSource(true);
  };

  const handleSaveSource = () => {
    if (!activeProject || !sourceTitle.trim()) return;
    
    const sourceData = {
      title: sourceTitle,
      authors: sourceAuthors || undefined,
      url: sourceUrl || undefined,
      publication: sourcePublication || undefined,
      year: sourceYear ? parseInt(sourceYear) : undefined,
      style: sourceStyle,
      citation: sourceCitation || generateCitation(sourceStyle),
      notes: sourceNotes || undefined,
    };
    
    if (editingSource) {
      updateResearchSource(activeProject.id, editingSource.id, sourceData);
    } else {
      addResearchSource(activeProject.id, sourceData);
    }
    
    setShowAddSource(false);
    resetSourceForm();
  };

  const generateCitation = (style: CitationStyle): string => {
    // Simple, just a placeholder for now
    const authorPart = sourceAuthors || 'Unknown Author';
    const yearPart = sourceYear || 'n.d.';
    if (style === 'APA') {
      return `${authorPart} (${yearPart}). ${sourceTitle}. ${sourcePublication || ''}`;
    }
    if (style === 'MLA') {
      return `${authorPart}. "${sourceTitle}". ${sourcePublication || ''}, ${yearPart}.`;
    }
    return `${authorPart}. ${sourceTitle}. ${sourcePublication || ''}, ${yearPart}.`;
  };

  const handleCreateProject = () => {
    if (!newProjectTitle.trim()) return;
    addResearchProject({
      title: newProjectTitle,
      description: newProjectDesc,
      notes: [],
      sources: [],
      tags: [],
      status: 'planning',
    });
    setNewProjectTitle('');
    setNewProjectDesc('');
    setShowNewProject(false);
  };

  const handleAddNote = () => {
    if (!activeProject || !newNoteTitle.trim()) return;
    addResearchNote(activeProject.id, {
      title: newNoteTitle,
      content: newNoteContent,
      tags: [],
    });
    setNewNoteTitle('');
    setNewNoteContent('');
    setShowAddNote(false);
  };

  if (activeProject) {
    return (
      <SafeAreaView style={styles.container} edges={['top']}>
        <View style={styles.projectHeader}>
          <Pressable
            style={styles.backBtn}
            onPress={() => setActiveResearchProject(null)}
          >
            <Text style={styles.backBtnText}>← Back</Text>
          </Pressable>
          <View style={styles.projectTitleRow}>
            <Text style={styles.projectTitle} numberOfLines={1}>
              {activeProject.title}
            </Text>
            <Pressable
              style={styles.statusChip}
              onPress={() => {
                const nextStatus =
                  activeProject.status === 'planning'
                    ? 'in_progress'
                    : activeProject.status === 'in_progress'
                    ? 'completed'
                    : 'planning';
                updateResearchProject(activeProject.id, { status: nextStatus });
              }}
            >
              <Text style={[
                styles.statusText,
                { color: STATUS_COLORS[activeProject.status] },
              ]}>
                {activeProject.status.toUpperCase()}
              </Text>
            </Pressable>
          </View>
        </View>
        
        {/* Tab bar */}
        <View style={styles.tabBar}>
          {['notes', 'sources', 'summary'].map(tab => (
            <Pressable 
              key={tab} 
              style={[styles.tab, activeTab === tab && styles.activeTab]}
              onPress={() => setActiveTab(tab as any)}
            >
              <Text style={[styles.tabText, activeTab === tab && styles.activeTabText]}>
                {tab.charAt(0).toUpperCase() + tab.slice(1)}
              </Text>
            </Pressable>
          ))}
        </View>

        <ScrollView contentContainerStyle={styles.projectScrollContent}>
          {/* Notes Tab */}
          {activeTab === 'notes' && (
            <View>
              <View style={styles.sectionHeader}>
                <Text style={styles.sectionTitle}>Notes</Text>
                <Pressable onPress={() => setShowAddNote(true)}>
                  <Text style={styles.addText}>+ Add Note</Text>
                </Pressable>
              </View>

              {activeProject.notes.length === 0 ? (
                <View style={styles.emptyNotes}>
                  <Text style={styles.emptyText}>No notes yet. Start researching!</Text>
                </View>
              ) : (
                activeProject.notes.map((note) => (
                  <View key={note.id} style={styles.noteCard}>
                    <View style={styles.noteHeader}>
                      <Text style={styles.noteTitle}>{note.title}</Text>
                      <Pressable
                        onPress={() => {
                          Alert.alert(
                            'Delete Note',
                            'Are you sure you want to delete this note?',
                            [
                              { text: 'Cancel', style: 'cancel' },
                              { text: 'Delete', onPress: () => deleteResearchNote(activeProject.id, note.id), style: 'destructive' },
                            ]
                          );
                        }}
                      >
                        <Text style={styles.deleteText}>✕</Text>
                      </Pressable>
                    </View>
                    <Text style={styles.noteContent}>{note.content}</Text>
                  </View>
                ))
              )}
            </View>
          )}
          
          {/* Sources Tab */}
          {activeTab === 'sources' && (
            <View>
              <View style={styles.sectionHeader}>
                <Text style={styles.sectionTitle}>Sources ({(activeProject.sources || []).length})</Text>
                <Pressable onPress={() => openSourceForm()}>
                  <Text style={styles.addText}>+ Add Source</Text>
                </Pressable>
              </View>
              
              {(activeProject.sources || []).length === 0 ? (
                <View style={styles.emptyNotes}>
                  <Text style={styles.emptyText}>No sources yet. Add your first source!</Text>
                </View>
              ) : (
                (activeProject.sources || []).map((src) => (
                  <View key={src.id} style={styles.sourceCard}>
                    <View style={styles.sourceHeader}>
                      <Text style={styles.sourceTitle}>{src.title}</Text>
                      <View style={styles.sourceActions}>
                        <Pressable onPress={() => openSourceForm(src)} style={styles.editSmall}>
                          <Text style={styles.editSmallText}>✏️</Text>
                        </Pressable>
                        <Pressable
                          onPress={() => {
                            Alert.alert(
                              'Delete Source',
                              'Are you sure you want to delete this source?',
                              [
                                { text: 'Cancel', style: 'cancel' },
                                { text: 'Delete', onPress: () => deleteResearchSource(activeProject.id, src.id), style: 'destructive' },
                              ]
                            );
                          }}
                          style={styles.editSmall}
                        >
                          <Text style={styles.deleteSmallText}>✕</Text>
                        </Pressable>
                      </View>
                    </View>
                    {src.authors && <Text style={styles.sourceMeta}>By: {src.authors}</Text>}
                    {src.publication && <Text style={styles.sourceMeta}>In: {src.publication}</Text>}
                    {src.year && <Text style={styles.sourceMeta}>Year: {src.year}</Text>}
                    <View style={styles.citationBox}>
                      <Text style={styles.citationLabel}>Citation ({src.style}):</Text>
                      <Text style={styles.citationText}>{src.citation}</Text>
                    </View>
                    {src.url && (
                      <Pressable style={styles.urlLink} onPress={() => Linking.openURL(src.url)}>
                        <Text style={styles.urlText}>🔗 View Source</Text>
                      </Pressable>
                    )}
                    {src.notes && <Text style={styles.sourceNotes}>{src.notes}</Text>}
                  </View>
                ))
              )}
            </View>
          )}
          
          {/* Summary Tab */}
          {activeTab === 'summary' && (
            <View>
              <View style={styles.sectionHeader}>
                <Text style={styles.sectionTitle}>AI-Powered Summary</Text>
              </View>
              
              <Text style={styles.summaryDesc}>
                Generate a summary of all your notes and sources for this research project.
              </Text>
              
              <Pressable style={styles.generateBtn} onPress={() => Alert.alert('Coming Soon', 'AI summary generation will be available soon!')}>
                <Text style={styles.generateBtnText}>✨ Generate Summary</Text>
              </Pressable>
              
              {activeProject.aiSummary && (
                <View style={styles.summaryBox}>
                  <Text style={styles.summaryText}>{activeProject.aiSummary}</Text>
                </View>
              )}
            </View>
          )}
        </ScrollView>

        {/* Add Note Modal */}
        {showAddNote && (
          <View style={styles.modalOverlay}>
            <View style={styles.modalContent}>
              <Text style={styles.modalTitle}>Add Note</Text>
              <TextInput
                style={styles.textInput}
                placeholder="Note title..."
                placeholderTextColor={Colors.textDim}
                value={newNoteTitle}
                onChangeText={setNewNoteTitle}
              />
              <TextInput
                style={[styles.textInput, styles.multilineInput]}
                placeholder="Write your notes here..."
                placeholderTextColor={Colors.textDim}
                value={newNoteContent}
                onChangeText={setNewNoteContent}
                multiline
              />
              <View style={styles.modalActions}>
                <Pressable onPress={() => setShowAddNote(false)}>
                  <Text style={styles.cancelText}>Cancel</Text>
                </Pressable>
                <Pressable style={styles.saveBtn} onPress={handleAddNote}>
                  <Text style={styles.saveBtnText}>Save</Text>
                </Pressable>
              </View>
            </View>
          </View>
        )}
        
        {/* Add/Edit Source Modal */}
        {showAddSource && (
          <View style={styles.modalOverlay}>
            <ScrollView style={styles.modalContent}>
              <Text style={styles.modalTitle}>{editingSource ? 'Edit Source' : 'Add Source'}</Text>
              
              <Text style={styles.inputLabel}>Title</Text>
              <TextInput
                style={styles.textInput}
                placeholder="Source title..."
                placeholderTextColor={Colors.textDim}
                value={sourceTitle}
                onChangeText={setSourceTitle}
              />
              
              <Text style={styles.inputLabel}>Author(s)</Text>
              <TextInput
                style={styles.textInput}
                placeholder="Author names..."
                placeholderTextColor={Colors.textDim}
                value={sourceAuthors}
                onChangeText={setSourceAuthors}
              />
              
              <Text style={styles.inputLabel}>URL (optional)</Text>
              <TextInput
                style={styles.textInput}
                placeholder="https://..."
                placeholderTextColor={Colors.textDim}
                value={sourceUrl}
                onChangeText={setSourceUrl}
                autoCapitalize="none"
              />
              
              <View style={styles.rowInput}>
                <View style={styles.flex1}>
                  <Text style={styles.inputLabel}>Publication</Text>
                  <TextInput
                    style={styles.textInput}
                    placeholder="Journal, book, etc."
                    placeholderTextColor={Colors.textDim}
                    value={sourcePublication}
                    onChangeText={setSourcePublication}
                  />
                </View>
                <View style={styles.flex1}>
                  <Text style={styles.inputLabel}>Year</Text>
                  <TextInput
                    style={styles.textInput}
                    placeholder="2024"
                    placeholderTextColor={Colors.textDim}
                    value={sourceYear}
                    onChangeText={setSourceYear}
                    keyboardType="numeric"
                  />
                </View>
              </View>
              
              <Text style={styles.inputLabel}>Citation Style</Text>
              <View style={styles.citationRow}>
                {CITATION_STYLES.map((style) => (
                  <Pressable
                    key={style}
                    style={[styles.citationStyleBtn, sourceStyle === style && styles.citationStyleActive]}
                    onPress={() => {
                      setSourceStyle(style);
                      setSourceCitation(generateCitation(style));
                    }}
                  >
                    <Text style={[styles.citationStyleText, sourceStyle === style && styles.citationStyleTextActive]}>
                      {style}
                    </Text>
                  </Pressable>
                ))}
              </View>
              
              <Text style={styles.inputLabel}>Generated Citation</Text>
              <TextInput
                style={[styles.textInput, styles.multilineInput]}
                placeholder="Citation..."
                placeholderTextColor={Colors.textDim}
                value={sourceCitation}
                onChangeText={setSourceCitation}
                multiline
              />
              
              <Text style={styles.inputLabel}>Notes (optional)</Text>
              <TextInput
                style={[styles.textInput, styles.multilineInput]}
                placeholder="Your notes on this source..."
                placeholderTextColor={Colors.textDim}
                value={sourceNotes}
                onChangeText={setSourceNotes}
                multiline
              />
              
              <View style={styles.modalActions}>
                <Pressable onPress={() => { setShowAddSource(false); resetSourceForm(); }}>
                  <Text style={styles.cancelText}>Cancel</Text>
                </Pressable>
                <Pressable style={styles.saveBtn} onPress={handleSaveSource}>
                  <Text style={styles.saveBtnText}>Save Source</Text>
                </Pressable>
              </View>
            </ScrollView>
          </View>
        )}
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <ScrollView contentContainerStyle={styles.scrollContent}>
        <Text style={styles.headerTitle}>Research Mode</Text>
        <Text style={styles.headerSubtitle}>
          Organize your research projects and take notes.
        </Text>

        {showNewProject ? (
          <View style={styles.newProjectCard}>
            <Text style={styles.sectionTitle}>New Project</Text>
            <TextInput
              style={styles.textInput}
              placeholder="Project title..."
              placeholderTextColor={Colors.textDim}
              value={newProjectTitle}
              onChangeText={setNewProjectTitle}
            />
            <TextInput
              style={[styles.textInput, styles.multilineInput]}
              placeholder="What are you researching?"
              placeholderTextColor={Colors.textDim}
              value={newProjectDesc}
              onChangeText={setNewProjectDesc}
              multiline
            />
            <View style={styles.newProjectActions}>
              <Pressable onPress={() => setShowNewProject(false)}>
                <Text style={styles.cancelText}>Cancel</Text>
              </Pressable>
              <Pressable
                style={[styles.createBtn, !newProjectTitle.trim() && styles.createBtnDisabled]}
                onPress={handleCreateProject}
                disabled={!newProjectTitle.trim()}
              >
                <Text style={styles.createBtnText}>Create</Text>
              </Pressable>
            </View>
          </View>
        ) : (
          <Pressable
            style={styles.addProjectBtn}
            onPress={() => setShowNewProject(true)}
          >
            <Text style={styles.addProjectText}>+ New Research Project</Text>
          </Pressable>
        )}

        <View style={styles.projectsList}>
          {researchProjects.map((project) => (
            <Pressable
              key={project.id}
              style={styles.projectCard}
              onPress={() => setActiveResearchProject(project.id)}
            >
              <View style={styles.projectCardHeader}>
                <Text style={styles.projectCardTitle}>{project.title}</Text>
                <Pressable
                  onPress={() => {
                    Alert.alert(
                      'Delete Project',
                      'Are you sure you want to delete this project and all its notes?',
                      [
                        { text: 'Cancel', style: 'cancel' },
                        { text: 'Delete', onPress: () => deleteResearchProject(project.id), style: 'destructive' },
                      ]
                    );
                  }}
                >
                  <Text style={styles.deleteText}>✕</Text>
                </Pressable>
              </View>
              {project.description && (
                <Text style={styles.projectCardDesc} numberOfLines={2}>
                  {project.description}
                </Text>
              )}
              <View style={styles.projectMetaRow}>
                <Text style={[
                  styles.projectStatus,
                  { color: STATUS_COLORS[project.status] },
                ]}>
                  {project.status.toUpperCase()}
                </Text>
                <Text style={styles.projectNoteCount}>
                  {project.notes.length} notes • {(project.sources || []).length} sources
                </Text>
              </View>
            </Pressable>
          ))}

          {researchProjects.length === 0 && !showNewProject && (
            <View style={styles.emptyState}>
              <Text style={styles.emptyStateIcon}>🔬</Text>
              <Text style={styles.emptyStateText}>No research projects yet.</Text>
              <Text style={styles.emptyStateSubtext}>Create one to start organizing your research!</Text>
            </View>
          )}
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  scrollContent: {
    padding: 20,
  },
  headerTitle: {
    ...Typography.heading,
    color: Colors.textPrimary,
    marginBottom: 4,
  },
  headerSubtitle: {
    ...Typography.body,
    color: Colors.textSecondary,
    marginBottom: 24,
  },
  addProjectBtn: {
    backgroundColor: `${Colors.tierFoundation}15`,
    borderWidth: 1,
    borderColor: Colors.tierFoundation,
    borderRadius: Radii.lg,
    paddingVertical: 16,
    alignItems: 'center',
    marginBottom: 24,
  },
  addProjectText: {
    ...Typography.subheading,
    color: Colors.tierFoundation,
    fontWeight: '700',
  },
  newProjectCard: {
    backgroundColor: Colors.surface,
    borderRadius: Radii.xl,
    padding: 20,
    borderWidth: 1,
    borderColor: Colors.glassBorder,
    marginBottom: 24,
  },
  sectionTitle: {
    ...Typography.subheading,
    color: Colors.textPrimary,
    marginBottom: 16,
  },
  textInput: {
    backgroundColor: Colors.surfaceElevated,
    borderRadius: Radii.lg,
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderWidth: 1,
    borderColor: Colors.glassBorder,
    color: Colors.textPrimary,
    marginBottom: 12,
    fontSize: 16,
  },
  multilineInput: {
    minHeight: 100,
    textAlignVertical: 'top',
  },
  newProjectActions: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    gap: 16,
    marginTop: 8,
  },
  cancelText: {
    ...Typography.body,
    color: Colors.textSecondary,
    paddingVertical: 8,
  },
  createBtn: {
    backgroundColor: Colors.tierFoundation,
    paddingHorizontal: 24,
    paddingVertical: 10,
    borderRadius: Radii.lg,
  },
  createBtnDisabled: {
    opacity: 0.5,
  },
  createBtnText: {
    ...Typography.body,
    color: '#000',
    fontWeight: '700',
  },
  projectsList: {
    gap: 12,
  },
  projectCard: {
    backgroundColor: Colors.surface,
    borderRadius: Radii.xl,
    padding: 16,
    borderWidth: 1,
    borderColor: Colors.glassBorder,
  },
  projectCardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 8,
  },
  projectCardTitle: {
    ...Typography.subheading,
    color: Colors.textPrimary,
    flex: 1,
  },
  deleteText: {
    color: Colors.error,
    fontSize: 20,
    fontWeight: '500',
    paddingLeft: 8,
  },
  projectCardDesc: {
    ...Typography.body,
    color: Colors.textSecondary,
    marginBottom: 12,
  },
  projectMetaRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  projectStatus: {
    ...Typography.caption,
    fontWeight: '700',
  },
  projectNoteCount: {
    ...Typography.caption,
    color: Colors.textDim,
  },
  emptyState: {
    alignItems: 'center',
    paddingVertical: 48,
  },
  emptyStateIcon: {
    fontSize: 64,
    marginBottom: 16,
  },
  emptyStateText: {
    ...Typography.subheading,
    color: Colors.textSecondary,
    marginBottom: 4,
  },
  emptyStateSubtext: {
    ...Typography.body,
    color: Colors.textDim,
  },

  projectHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: Colors.glassBorder,
  },
  backBtn: {
    paddingVertical: 8,
    paddingHorizontal: 4,
  },
  backBtnText: {
    ...Typography.body,
    color: Colors.tierFoundation,
    fontWeight: '600',
  },
  projectTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    flex: 1,
    paddingLeft: 8,
  },
  projectTitle: {
    ...Typography.subheading,
    color: Colors.textPrimary,
    flex: 1,
  },
  statusChip: {
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: Radii.full,
    backgroundColor: Colors.surfaceElevated,
    borderWidth: 1,
    borderColor: Colors.glassBorder,
  },
  statusText: {
    ...Typography.caption,
    fontWeight: '700',
  },
  tabBar: {
    flexDirection: 'row',
    gap: 8,
    paddingHorizontal: 20,
    paddingTop: 12,
    paddingBottom: 8,
    borderBottomWidth: 1,
    borderBottomColor: Colors.glassBorder,
  },
  tab: {
    flex: 1,
    paddingVertical: 10,
    alignItems: 'center',
    borderRadius: Radii.md,
  },
  activeTab: {
    backgroundColor: Colors.surface,
    borderBottomWidth: 2,
    borderBottomColor: Colors.tierFoundation,
  },
  tabText: {
    ...Typography.body,
    color: Colors.textDim,
    fontWeight: '600',
  },
  activeTabText: {
    color: Colors.tierFoundation,
  },
  projectScrollContent: {
    padding: 20,
  },
  projectDescription: {
    ...Typography.body,
    color: Colors.textSecondary,
    marginBottom: 24,
    lineHeight: 22,
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  addText: {
    ...Typography.body,
    color: Colors.tierFoundation,
    fontWeight: '600',
  },
  noteCard: {
    backgroundColor: Colors.surface,
    borderRadius: Radii.lg,
    padding: 16,
    borderWidth: 1,
    borderColor: Colors.glassBorder,
    marginBottom: 12,
  },
  noteHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  noteTitle: {
    ...Typography.subheading,
    color: Colors.textPrimary,
  },
  noteContent: {
    ...Typography.body,
    color: Colors.textSecondary,
    lineHeight: 22,
  },
  emptyNotes: {
    paddingVertical: 48,
    alignItems: 'center',
  },
  emptyText: {
    ...Typography.body,
    color: Colors.textDim,
  },
  
  // Source styles
  sourceCard: {
    backgroundColor: Colors.surface,
    borderRadius: Radii.lg,
    padding: 16,
    borderWidth: 1,
    borderColor: Colors.glassBorder,
    marginBottom: 12,
  },
  sourceHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
  },
  sourceTitle: {
    ...Typography.subheading,
    color: Colors.textPrimary,
    flex: 1,
    marginBottom: 8,
  },
  sourceActions: {
    flexDirection: 'row',
    gap: 8,
  },
  editSmall: {
    padding: 4,
  },
  editSmallText: {
    fontSize: 16,
    color: Colors.tierFoundation,
  },
  deleteSmall: {
    padding: 4,
  },
  deleteSmallText: {
    color: Colors.error,
    fontSize: 20,
    fontWeight: '700',
  },
  sourceMeta: {
    ...Typography.caption,
    color: Colors.textSecondary,
    marginBottom: 4,
  },
  citationBox: {
    backgroundColor: Colors.surfaceElevated,
    borderRadius: Radii.md,
    padding: 12,
    marginTop: 8,
    marginBottom: 8,
    borderWidth: 1,
    borderColor: Colors.glassBorder,
  },
  citationLabel: {
    ...Typography.small,
    color: Colors.textDim,
    marginBottom: 4,
    letterSpacing: 1,
  },
  citationText: {
    ...Typography.caption,
    color: Colors.textPrimary,
    fontFamily: 'Courier',
  },
  urlLink: {
    paddingVertical: 4,
    paddingBottom: 8,
  },
  urlText: {
    ...Typography.body,
    color: Colors.tierFoundation,
    fontWeight: '600',
  },
  sourceNotes: {
    ...Typography.body,
    color: Colors.textSecondary,
    marginTop: 8,
  },
  
  // Summary styles
  summaryDesc: {
    ...Typography.body,
    color: Colors.textSecondary,
    marginBottom: 16,
  },
  generateBtn: {
    backgroundColor: Colors.tierAdvanced,
    borderRadius: Radii.lg,
    paddingVertical: 16,
    alignItems: 'center',
    marginBottom: 20,
  },
  generateBtnText: {
    ...Typography.subheading,
    color: '#000',
    fontWeight: '800',
  },
  summaryBox: {
    backgroundColor: Colors.surface,
    borderRadius: Radii.lg,
    padding: 20,
    borderWidth: 1,
    borderColor: Colors.glassBorder,
  },
  summaryText: {
    ...Typography.body,
    color: Colors.textPrimary,
    lineHeight: 24,
  },
  
  // Input styles
  inputLabel: {
    ...Typography.small,
    color: Colors.textDim,
    marginBottom: 6,
    letterSpacing: 0.8,
  },
  rowInput: {
    flexDirection: 'row',
    gap: 12,
  },
  flex1: {
    flex: 1,
  },
  citationRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginBottom: 12,
  },
  citationStyleBtn: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: Radii.md,
    backgroundColor: Colors.surfaceElevated,
    borderWidth: 1,
    borderColor: Colors.glassBorder,
  },
  citationStyleActive: {
    backgroundColor: `${Colors.tierFoundation}20`,
    borderColor: Colors.tierFoundation,
  },
  citationStyleText: {
    ...Typography.caption,
    color: Colors.textSecondary,
    fontWeight: '600',
  },
  citationStyleTextActive: {
    color: Colors.tierFoundation,
  },
  
  modalOverlay: {
    ...StyleSheet.absoluteFill,
    backgroundColor: 'rgba(0,0,0,0.75)',
    justifyContent: 'flex-end',
    padding: 0,
    paddingTop: 80,
    zIndex: 100,
  },
  modalContent: {
    backgroundColor: Colors.surface,
    borderTopLeftRadius: Radii.xl,
    borderTopRightRadius: Radii.xl,
    padding: 24,
    borderWidth: 1,
    borderColor: Colors.glassBorder,
    maxHeight: '85%',
  },
  modalTitle: {
    ...Typography.heading,
    color: Colors.textPrimary,
    marginBottom: 20,
  },
  modalActions: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    gap: 16,
    marginTop: 12,
    marginBottom: 20,
  },
  saveBtn: {
    backgroundColor: Colors.tierFoundation,
    paddingHorizontal: 24,
    paddingVertical: 10,
    borderRadius: Radii.lg,
  },
  saveBtnText: {
    ...Typography.body,
    color: '#000',
    fontWeight: '700',
  },
});
