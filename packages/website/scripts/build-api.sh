packages=("mobx-zod-form" "mobx-zod-form-react")

for package in ${packages[@]}; do
  echo $package
  cd ../$package
  typedoc . \
    --entryPointStrategy packages \
    --tsconfig ../mobx-zod-form/tsconfig.json \
    --out out/docs \
    --readme none \
    --name 'Mobx Zod Form'
  cd -
done

typedoc
