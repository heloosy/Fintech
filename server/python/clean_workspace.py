import os, glob

workspace_dir = r"c:\Users\SYLVIA TOM\.gemini\antigravity-ide\scratch\insure-os\server\data\workspaces\LOCAL-WORKSPACE"
for f in glob.glob(os.path.join(workspace_dir, "*.json")):
    os.remove(f)
    print("Removed legacy file:", os.path.basename(f))

print("LOCAL-WORKSPACE storage cleaned.")
