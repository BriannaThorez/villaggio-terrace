import os

file_path = r'c:\AIDev\AiDev_LLM\villaggio-terrace\src\shared\utils\store.ts'

with open(file_path, 'r', encoding='utf-8') as f:
    lines = f.readlines()

new_lines = []
skip = False

for i, line in enumerate(lines):
    if "const stateAfter = get();" in line and "const deletedWasEmptyFloor = shapeToDelete?.type === \"empty_floor\";" in lines[i+1]:
        new_lines.append(line)
        new_lines.append(lines[i+1])
        new_lines.append('      if (!isMerge && !deletedWasEmptyFloor && shapeToDelete) {\n')
        new_lines.append('        // --- INDUSTRY LEADING LOCALIZED VACANCY RESTORATION ---\n')
        new_lines.append('        reconstructVacancy({\n')
        new_lines.append('          deletedShape: shapeToDelete,\n')
        new_lines.append('          currentShapes: stateAfter.shapes,\n')
        new_lines.append('          addShapeCallback: stateAfter.addShape\n')
        new_lines.append('        });\n')
        new_lines.append('        if (stateAfter.selectedId === id) {\n')
        new_lines.append('          stateAfter.setSelectedId(null);\n')
        new_lines.append('        }\n')
        new_lines.append('      }\n')
        new_lines.append('    },\n')
        
        skip = True
        continue
        
    if skip:
        if "addLink: (from, to, fromPort, toPort) => {" in line:
            skip = False
            new_lines.append(line)
        continue
        
    if not skip:
        # Don't duplicate the if deletedWasEmptyFloor if we appended it manually
        if "const deletedWasEmptyFloor" in line and "const stateAfter = get();" in lines[i-1]:
            continue
        new_lines.append(line)

with open(file_path, 'w', encoding='utf-8') as f:
    f.writelines(new_lines)

print("Replaced logic block successfully.")
