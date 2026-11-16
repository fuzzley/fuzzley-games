#!/usr/bin/env bash
# Takes pics.mjs' screenshots of the runs named, of each build named, served in turn on PORT (9151 unless it says) from
# <build>-dist in the current folder, into <out folder>: kept, the run kept on wave 9 gone on with the gun held, at
# frames 10, 40, 80, 140, 200 and 260; clearing, the run the layout check clears, its volatile rock's blast, at frames
# 3, 8, 15, 25, 40 and 60; foundry, the run kept on wave 17, Foundry, gone on with the gun held as its first burr comes
# in, at frames 150, 200, 260, 330, 420 and 520; each in Casino night and Classic felt, at 1,280 × 720 and 360 × 640,
# with motion and without. It reads the runs' init scripts, pics-<run>.js, from the current folder, where runs.mjs
# writes them.
# Usage: pics-all.sh <out folder> <runs, by commas: kept,clearing,foundry> <build>...
here=$(cd "$(dirname "$0")" && pwd)
export PORT=${PORT:-9151}
out=$1 runs=$2
shift 2
mkdir -p "$out"
for build in "$@"; do
  "$here/../F1-budget/serve.sh" "$PWD/$build-dist" > /dev/null || exit 1
  for run in ${runs//,/ }; do
    case $run in
      kept) fire=1 marks=10,40,80,140,200,260 ;;
      clearing) fire=0 marks=3,8,15,25,40,60 ;;
      foundry) fire=1 marks=150,200,260,330,420,520 ;;
      *) echo "no run named $run" >&2; exit 1 ;;
    esac
    for palette in casino classic; do
      for size in roomy:1280:720 phone:360:640; do
        IFS=: read -r name w h <<< "$size"
        for reduce in 0 1; do
          motion=$([ $reduce = 1 ] && echo still || echo motion)
          node "$here/pics.mjs" "$out/$run-$palette-$name-$motion-$build" "pics-$run.js" $palette $w $h $reduce $fire $marks ||
            echo "FAILED $run $palette $name $motion $build"
        done
      done
    done
  done
done
"$here/../F1-budget/serve.sh" stop
