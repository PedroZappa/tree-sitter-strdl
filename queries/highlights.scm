; ---------------------------------------------------------------------------
;  Strudel syntax-highlighting rules
; ---------------------------------------------------------------------------
;  CAPTURE NAMING
;  1. Contextual patterns identify the syntactic role of each node.
;  2. No generic identifier fallback is used, so one node receives one capture.
;  3. Capture names follow tree-sitter-highlight conventions.
; ---------------------------------------------------------------------------

; Keywords
[
  "var"
  "let"
  "const"
  "function"
  "return"
  "try"
  "catch"
  "import"
  "export"
  "default"
  "from"
  "as"
  "new"
  "await"
] @keyword

; Punctuation
[
  "."
  "?."
  ","
  ":"
  ";"
  "?"
  "${"
] @punctuation.delimiter

[
  "("
  ")"
  "["
  "]"
  "{"
  "}"
] @punctuation.bracket

; Operators
[
  "="
  "=>"
  "..."
  "!"
  "<"
  ">"
  "<="
  ">="
  "=="
  "==="
  "!="
  "!=="
  "+"
  "-"
  "*"
  "/"
] @operator

; Literals
(string) @string
(number) @number
(comment) @comment

; Declarations and bindings
(variable_declarator
  name: (identifier) @variable)

(variable_declarator
  value: (identifier) @variable)

(function_declaration
  name: (identifier) @function.declaration)

(import_specifier
  name: (identifier) @variable)

(import_specifier
  alias: (identifier) @variable)

(formal_parameters
  parameter: (identifier) @variable.parameter)

(array_pattern
  element: (identifier) @variable.parameter)

(assignment_pattern
  left: (identifier) @variable.parameter)

(assignment_pattern
  right: (identifier) @variable)

(arrow_function
  parameters: (identifier) @variable.parameter)

(arrow_function
  body: (identifier) @variable)

(labeled_statement
  label: (identifier) @label)

(try_statement
  parameter: (identifier) @variable.parameter)

; Calls and member access
(call_expression
  function: (identifier) @function.call)

(call_expression
  function: (member_expression
    property: (identifier)) @function.method)

(tagged_template_expression
  tag: (identifier) @function.call)

(member_expression
  object: (identifier) @variable)

(member_expression
  property: (identifier) @property)

(subscript_expression
  object: (identifier) @variable)

(subscript_expression
  index: (identifier) @variable)

; Assignments and properties
(assignment_expression
  left: (identifier) @variable)

(assignment_expression
  right: (identifier) @variable)

(pair
  key: (identifier) @property)

(pair
  value: (identifier) @variable)

(computed_property_name
  expression: (identifier) @variable)

; Expression context
(binary_expression
  left: (identifier) @variable)

(binary_expression
  right: (identifier) @variable)

(unary_expression
  argument: (identifier) @variable)

(await_expression
  argument: (identifier) @variable)

(new_expression
  constructor: (identifier) @constructor)

(arguments
  argument: (identifier) @variable)

(array
  element: (identifier) @variable)

(spread_element
  value: (identifier) @variable)

(parenthesized_expression
  expression: (identifier) @variable)

(conditional_expression
  condition: (identifier) @variable)

(conditional_expression
  consequence: (identifier) @variable)

(conditional_expression
  alternative: (identifier) @variable)

(template_substitution
  expression: (identifier) @variable)

(return_statement
  value: (identifier) @variable)

(export_declaration
  value: (identifier) @variable)

(expression_statement
  (identifier) @variable)

(binary_expression) @expression
(unary_expression) @expression
(conditional_expression) @expression
(template_substitution
  expression: (_) @expression)

; Constructors are captured through `new_expression` above.
