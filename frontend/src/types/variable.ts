export interface Variable {
  key: string
  label: string
  category: string
  type: 'string' | 'number' | 'boolean' | 'date' | 'array' | 'object'
  description: string
  example: string | number | boolean
  path: string
  required: boolean
  availableInPayload: boolean
  availableInPreview: boolean
}

export interface VariableCategory {
  name: string
  count: number
  variables: Variable[]
}

export interface ValidationError {
  variable: string
  position: number
  suggestion: string | null
}

export interface ValidationResult {
  valid: boolean
  errors: ValidationError[]
}

export interface RenderRequest {
  template: string
  context: Record<string, unknown>
}

export interface RenderResult {
  rendered: string
}

export interface DocEntry {
  variable: string
  description: string
  example: string | number | boolean
  type: string
}

export interface DocCategory {
  category: string
  variables: DocEntry[]
}
