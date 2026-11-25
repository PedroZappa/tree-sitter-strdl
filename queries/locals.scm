; ---------------------------------------------------------------------------
;  Strudel locals.scm — lexical scopes, definitions, and references
; ---------------------------------------------------------------------------

; Scopes
[
  (source_file)
  (block)
  (arrow_function)
  (function_declaration)
] @local.scope

; Definitions
(variable_declarator
  name: (identifier) @local.definition.var)

(assignment_expression
  left: (identifier) @local.definition.var)

(function_declaration
  name: (identifier) @local.definition.function)

(formal_parameters
  parameter: (identifier) @local.definition.parameter)

(array_pattern
  element: (identifier) @local.definition.parameter)

(assignment_pattern
  left: (identifier) @local.definition.parameter)

(arrow_function
  parameters: (identifier) @local.definition.parameter)

(import_specifier
  name: (identifier) @local.definition.var)

(try_statement
  parameter: (identifier) @local.definition.parameter)

(pair
  key: (identifier) @local.definition.property)

; References
(identifier) @local.reference
