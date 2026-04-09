import { useEffect, useMemo, useState } from 'react';
import {
  buildActivityFromForm,
  createEmptyForm,
  getMetrics,
  getUpcomingActivities,
  getVisibleActivities,
  hasOverdueActivities,
  validateActivityForm
} from '../model/activity-model.js';
import {
  exportActivitiesAsJson,
  fetchLightContent,
  loadActivities,
  loadCachedLightContent,
  saveActivities
} from '../model/activity-repository.js';
import {
  DIFFICULTY_OPTIONS,
  FALLBACK_LIGHT_CONTENT,
  INITIAL_FILTER,
  STATUS_OPTIONS,
  SUBJECT_OPTIONS
} from '../model/constants.js';

export function usePlannerViewModel() {
  const [activities, setActivities] = useState([]);
  const [form, setForm] = useState(createEmptyForm());
  const [editingId, setEditingId] = useState(null);
  const [filter, setFilter] = useState(INITIAL_FILTER);
  const [isOnline, setIsOnline] = useState(navigator.onLine);
  const [lightContent, setLightContent] = useState(FALLBACK_LIGHT_CONTENT);

  useEffect(() => {
    setActivities(loadActivities());
  }, []);

  useEffect(() => {
    saveActivities(activities);
  }, [activities]);

  useEffect(() => {
    const onOnline = () => setIsOnline(true);
    const onOffline = () => setIsOnline(false);

    window.addEventListener('online', onOnline);
    window.addEventListener('offline', onOffline);

    return () => {
      window.removeEventListener('online', onOnline);
      window.removeEventListener('offline', onOffline);
    };
  }, []);

  useEffect(() => {
    setLightContent(loadCachedLightContent());

    fetchLightContent()
      .then((payload) => {
        setLightContent(payload);
      })
      .catch(() => {
        // fallback já coberto pelo cache local e constante padrão
      });
  }, []);

  const visibleActivities = useMemo(() => getVisibleActivities(activities, filter), [activities, filter]);
  const metrics = useMemo(() => getMetrics(activities), [activities]);
  const upcoming = useMemo(() => getUpcomingActivities(activities), [activities]);
  const hasOverdueVisible = useMemo(() => hasOverdueActivities(visibleActivities), [visibleActivities]);

  function updateField(name, value) {
    setForm((prev) => ({ ...prev, [name]: value }));
  }

  function resetForm() {
    setForm(createEmptyForm());
    setEditingId(null);
  }

  function handleSubmit(event) {
    event.preventDefault();

    const missingFields = validateActivityForm(form);
    if (missingFields.length) {
      return;
    }

    if (editingId) {
      setActivities((prev) =>
        prev.map((item) => (item.id === editingId ? buildActivityFromForm(form, editingId) : item))
      );
      resetForm();
      return;
    }

    setActivities((prev) => [buildActivityFromForm(form, crypto.randomUUID()), ...prev]);
    resetForm();
  }

  function handleDelete(id) {
    setActivities((prev) => prev.filter((item) => item.id !== id));
    if (editingId === id) {
      resetForm();
    }
  }

  function handleEdit(activity) {
    setEditingId(activity.id);
    setForm({ ...activity });
  }

  function toggleCompleted(activity) {
    const nextStatus = activity.status === 'Concluída' ? 'Em andamento' : 'Concluída';
    setActivities((prev) => prev.map((item) => (item.id === activity.id ? { ...item, status: nextStatus } : item)));
  }

  function handleExport() {
    exportActivitiesAsJson(visibleActivities);
  }

  return {
    editingId,
    form,
    isOnline,
    lightContent,
    metrics,
    upcoming,
    visibleActivities,
    filter,
    hasOverdueVisible,
    options: {
      subjects: SUBJECT_OPTIONS,
      difficulties: DIFFICULTY_OPTIONS,
      statuses: STATUS_OPTIONS
    },
    actions: {
      handleDelete,
      handleEdit,
      handleExport,
      handleSubmit,
      resetForm,
      setFilter,
      toggleCompleted,
      updateField
    }
  };
}
