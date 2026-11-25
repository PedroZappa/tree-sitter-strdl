; ---------------------------------------------------------------------------
;  Strudel syntax-highlighting rules
; ---------------------------------------------------------------------------
;  CAPTURE NAMING
;  1. Specific patterns precede generic patterns.
;  2. Capture names follow tree-sitter-highlight conventions.
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
  ","
  ":"
  ";"
  "?"
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

(function_declaration
  name: (identifier) @function.declaration)

(import_specifier
  name: (identifier) @variable)

[
  (formal_parameters)
  (array_pattern)
  (assignment_pattern)
] @variable.parameter

(formal_parameters
  parameter: (identifier) @variable.parameter)

(array_pattern
  element: (identifier) @variable.parameter)

(assignment_pattern
  left: (identifier) @variable.parameter)

(arrow_function
  parameters: (identifier) @variable.parameter)

(labeled_statement
  label: (identifier) @label)

; Calls and member access
(call_expression
  function: (identifier) @function.call)

(call_expression
  function: (member_expression
    property: (identifier)) @function.method)

(member_expression
  property: (identifier) @property)

(subscript_expression
  index: (_) @property)

; Strudel API names are semantic aliases for editor convenience only.
(call_expression
  function: (identifier) @function.control
  (#any-of? @function.control "setCps" "setCpm" "setTempo" "setBpm"))

(call_expression
  function: (identifier) @function.audio
  (#any-of? @function.audio "samples" "sound" "s" "note" "n" "freq"))

(call_expression
  function: (identifier) @function.pattern
  (#any-of? @function.pattern "scale" "chord" "pattern" "seq" "sequence" "stack"
    "layer" "cat" "append" "add" "mul" "div" "sub" "fast" "slow" "speed" "iter"
    "every" "sometimes" "rarely" "often" "jux" "juxBy" "rev" "palindrome" "shuffle"))

(call_expression
  function: (identifier) @function.effect
  (#any-of? @function.effect "lpf" "hpf" "bpf" "lpq" "hpq" "bpq" "cutoff" "resonance"
    "filter" "reverb" "delay" "room" "size" "echo" "phaser" "crush" "coarse"
    "distort" "dist" "vowel" "pan" "gain" "velocity" "attack" "decay" "sustain"
    "release" "adsr"))

(call_expression
  function: (identifier) @function.envelope
  (#any-of? @function.envelope "att" "dec" "sus" "rel" "penv" "lpenv" "hpenv"
    "bpenv" "tremolo" "am" "compressor"))

(call_expression
  function: (identifier) @function.time
  (#any-of? @function.time "fast" "slow" "hurry" "linger" "trunc" "mask" "struct"
    "euclidean" "swing" "late" "early"))

(call_expression
  function: (identifier) @function.utility
  (#any-of? @function.utility "silence" "rest" "_" "choose" "chooseInWith"
    "range" "run" "scan" "sine" "cosine" "saw" "square" "rand" "perlin"))

(call_expression
  function: (identifier) @function.midi
  (#any-of? @function.midi "midi" "ccv" "ccn" "bend" "program" "bank" "ch"
    "channel" "polyTouch" "polyAftertouch"))

(call_expression
  function: (identifier) @function.sample
  (#any-of? @function.sample "begin" "end" "loop" "chop" "striate" "slice"
    "splice" "speed" "unit" "coarse"))

; Assignments and properties
(assignment_expression
  left: (identifier) @variable)

(pair
  key: (identifier) @property)

(pair
  key: (string) @property)

(pair
  key: (number) @property)

; Expression context
(binary_expression) @expression
(unary_expression) @expression
(conditional_expression) @expression
(template_substitution
  expression: (_) @expression)

; Containers
(object) @constructor
(array) @constructor

; Generic identifier fallback
(identifier) @variable
