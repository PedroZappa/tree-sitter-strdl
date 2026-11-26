#include <stdio.h>

#include "tree_sitter/tree-sitter-strudel.h"

int main(void) {
  const TSLanguage *language = tree_sitter_strudel();
  if (language == NULL) {
    fprintf(stderr, "tree_sitter_strudel() returned NULL\n");
    return 1;
  }

  puts("C binding language pointer ok");
  return 0;
}
