type TextRow = {
  citat_es?: string | null
  citat_en?: string | null
  citat_de?: string | null
  citat_pt?: string | null
  citat_fr?: string | null
  citat_it?: string | null
}

export function getCompletedLanguages(text: TextRow) {

  const languages = [
    text.citat_es,
    text.citat_en,
    text.citat_de,
    text.citat_pt,
    text.citat_fr,
    text.citat_it
  ]

  const completed = languages.filter(
    (lang) =>
      lang !== null &&
      lang !== undefined &&
      lang.trim() !== ''
  ).length

  return {
    completed,
    total: 6
  }

}