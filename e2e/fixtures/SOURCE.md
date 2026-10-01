# Fixtures versionnées

- `sample.heic` : `examples/example.heic` du dépôt [libheif](https://github.com/strukturag/libheif) (licence MIT, voir `examples/COPYING`). Image 1280×854 sans données personnelles. Elle sert à tester la conversion HEIC → JPEG à l'upload. On ne sait pas générer de HEIC localement : sharp n'a pas d'encodeur HEVC.

Les autres fixtures (JPEG, PNG, texte) sont générées par `global-setup.ts` dans `e2e/.fixtures/`, qui est gitignoré.
