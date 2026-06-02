export const getStatusStyles = (
  status?: string | null
) => {

  switch (status) {

    case 'În traducere':

      return {
        bg: '#fff7ef',
        text: '#f97316',
        dot: '#f97316'
      }

    case 'În validare':

      return {
        bg: '#fff9e8',
        text: '#d4a017',
        dot: '#d4a017'
      }

    case 'Respins':

      return {
        bg: '#fff1f1',
        text: '#dc2626',
        dot: '#dc2626'
      }

    case 'Validat':

      return {
        bg: '#eefbf2',
        text: '#16a34a',
        dot: '#16a34a'
      }

    default:

      return {
        bg: '#f4f4f5',
        text: '#71717a',
        dot: '#71717a'
      }

  }

}