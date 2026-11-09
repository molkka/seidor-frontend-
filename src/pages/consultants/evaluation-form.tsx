import { useId, type KeyboardEvent } from 'react'
import { Award, Briefcase, Check, ChevronDown, Star } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { SAP_MODULES } from '@/lib/sap-modules'
import styles from './evaluation-form.module.css'

type EvaluationMode = 'skill' | 'project'

interface EvaluationFormProps {
  mode: EvaluationMode
  modules: string[]
  projects: { id: number; nom: string; wbs_code: string }[]
  module: string
  projectId: number | null
  rating: number
  hovered: number
  comment: string
  saving: boolean
  error: string
  onModeChange: (mode: EvaluationMode) => void
  onModuleChange: (module: string) => void
  onProjectChange: (id: number | null) => void
  onRatingChange: (rating: number) => void
  onHoverChange: (rating: number) => void
  onCommentChange: (comment: string) => void
  onSave: () => void
  onCancel: () => void
}

export function EvaluationForm({
  mode, modules, projects, module, projectId, rating, hovered, comment, saving, error,
  onModeChange, onModuleChange, onProjectChange, onRatingChange, onHoverChange,
  onCommentChange, onSave, onCancel,
}: EvaluationFormProps) {
  const id = useId()
  const selectionId = `${id}-selection`
  const errorId = `${id}-error`
  const ratingId = `${id}-rating`
  const ratingHelpId = `${id}-rating-help`
  const commentId = `${id}-comment`
  const selectionInvalid = Boolean(error) && (mode === 'skill' ? !module : !projectId)
  const ratingInvalid = Boolean(error) && !rating
  const preview = hovered || rating

  function navigateRating(event: KeyboardEvent<HTMLButtonElement>, value: number) {
    const next = event.key === 'Home' ? 1 : event.key === 'End' ? 5
      : event.key === 'ArrowRight' || event.key === 'ArrowDown' ? value % 5 + 1
      : event.key === 'ArrowLeft' || event.key === 'ArrowUp' ? (value + 3) % 5 + 1 : null
    if (next === null) return
    event.preventDefault()
    onHoverChange(0)
    onRatingChange(next)
    event.currentTarget.parentElement?.querySelectorAll<HTMLButtonElement>('[role="radio"]')[next - 1]?.focus()
  }

  return (
    <form className={styles.form} noValidate aria-label="Nouvelle évaluation" aria-busy={saving}
      onSubmit={event => { event.preventDefault(); if (!saving) onSave() }}>
      <Tabs value={mode} onValueChange={value => onModeChange(value as EvaluationMode)} className={styles.tabs}>
        <TabsList className={styles.modeList} aria-label="Type d’évaluation">
          <TabsTrigger className={styles.modeTab} value="skill" disabled={saving} aria-label="Par compétence (module)">
            <Award size={17} aria-hidden="true" />
            <span>Par compétence<small>Module SAP</small></span>
          </TabsTrigger>
          <TabsTrigger className={styles.modeTab} value="project" disabled={saving} aria-label="Par projet (rendement)">
            <Briefcase size={17} aria-hidden="true" />
            <span>Par projet<small>Rendement</small></span>
          </TabsTrigger>
        </TabsList>
        <TabsContent value={mode} className={styles.content}>
          {error && <p id={errorId} role="alert" className={styles.error}>{error}</p>}
          <fieldset disabled={saving} className={styles.fields}>
            <legend className={styles.srOnly}>{mode === 'skill' ? 'Évaluation par compétence' : 'Évaluation par projet'}</legend>
            <div className={styles.field}>
              <label htmlFor={selectionId} className={styles.label}>
                {mode === 'skill' ? 'Module / Compétence' : 'Projet'} <span className={styles.required} aria-hidden="true">*</span>
              </label>
              <div className={styles.selectWrap}>
                {mode === 'skill' ? (
                  <select id={selectionId} className={styles.control} value={module} aria-required="true"
                    aria-invalid={selectionInvalid} aria-describedby={selectionInvalid ? errorId : undefined}
                    onChange={event => onModuleChange(event.target.value)}>
                    <option value="">Sélectionner un module</option>
                    {modules.length > 0 && <optgroup label="Modules du consultant">
                      {modules.map(skill => <option key={skill} value={skill}>{skill}</option>)}
                    </optgroup>}
                    <optgroup label="Autres compétences SAP">
                      {SAP_MODULES.filter(skill => !modules.includes(skill)).map(skill => <option key={skill} value={skill}>{skill}</option>)}
                    </optgroup>
                  </select>
                ) : (
                  <select id={selectionId} className={styles.control} value={projectId ?? ''} aria-required="true"
                    aria-invalid={selectionInvalid} aria-describedby={selectionInvalid ? errorId : undefined}
                    onChange={event => onProjectChange(event.target.value ? Number(event.target.value) : null)}>
                    <option value="">Sélectionner un projet</option>
                    {projects.map(project => <option key={project.id} value={project.id}>{project.nom} ({project.wbs_code})</option>)}
                  </select>
                )}
                <ChevronDown size={16} className={styles.selectIcon} aria-hidden="true" />
              </div>
            </div>
            <div className={styles.ratingField}>
              <div className={styles.ratingHeading}>
                <span id={ratingId} className={styles.label}>Note <span className={styles.required} aria-hidden="true">*</span></span>
                <span className={styles.ratingValue} aria-hidden="true">{rating ? `${rating} / 5` : 'Sur 5 étoiles'}</span>
              </div>
              <div role="radiogroup" aria-labelledby={ratingId} aria-required="true" aria-invalid={ratingInvalid}
                aria-describedby={`${ratingHelpId}${ratingInvalid ? ` ${errorId}` : ''}`}
                className={styles.stars} onMouseLeave={() => onHoverChange(0)}>
                {[1, 2, 3, 4, 5].map(value => (
                  <button key={value} type="button" role="radio" aria-checked={rating === value}
                    aria-label={`${value} étoile${value > 1 ? 's' : ''} sur 5`}
                    tabIndex={rating === value || (!rating && value === 1) ? 0 : -1}
                    className={styles.star} data-filled={preview >= value} data-preview={hovered > 0}
                    title={`${value} / 5`}
                    onClick={() => onRatingChange(value === rating ? 0 : value)}
                    onMouseEnter={() => onHoverChange(value)} onKeyDown={event => navigateRating(event, value)}>
                    <Star size={23} strokeWidth={1.7} aria-hidden="true" />
                  </button>
                ))}
              </div>
              <p id={ratingHelpId} className={styles.hint}>
                {rating ? 'Cliquez à nouveau sur la note pour l’effacer.' : 'Sélectionnez une note de 1 à 5.'}
                <span className={styles.srOnly}> Utilisez les flèches pour changer la note, Entrée ou Espace pour la sélectionner ou l’effacer.</span>
              </p>
              <span className={styles.srOnly} role="status">{rating ? `${rating} étoile${rating > 1 ? 's' : ''} sur 5 sélectionnée${rating > 1 ? 's' : ''}.` : 'Aucune note sélectionnée.'}</span>
            </div>
            <div className={styles.field}>
              <label htmlFor={commentId} className={styles.label}>Commentaire <span className={styles.optional}>Optionnel</span></label>
              <textarea id={commentId} value={comment} className={`${styles.control} ${styles.textarea}`} rows={3}
                onChange={event => onCommentChange(event.target.value)}
                placeholder={mode === 'skill' ? 'Niveau de maîtrise, points forts, certifications…' : 'Qualité de livraison, comportement, respect des délais…'} />
            </div>
          </fieldset>
        </TabsContent>
      </Tabs>
      <div className={styles.actions}>
        <Button type="submit" disabled={saving} className={styles.primary}>
          {!saving && <Check size={15} aria-hidden="true" />}
          {saving ? 'Enregistrement…' : 'Enregistrer'}
        </Button>
        <Button type="button" variant="outline" disabled={saving} className={styles.secondary} onClick={onCancel}>Annuler</Button>
      </div>
    </form>
  )
}
