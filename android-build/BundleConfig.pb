optimizations {
  splits_config {
    split_dimension {
      value: LANGUAGE
      negate: false
    }
  }
}
compression {
  uncompressed_glob: "assets/**"
}
