#!/usr/bin/env python3

import os
import re
import glob

def fix_catch_blocks(file_path):
    """Fix catch (error: any) blocks in TypeScript files"""
    
    with open(file_path, 'r', encoding='utf-8') as f:
        content = f.read()
    
    # Pattern to match catch (error: any) blocks
    pattern = r'catch \(error: any\) \{(.*?\n)*?\}'
    
    def replace_catch(match):
        catch_block = match.group(0)
        
        # Replace the catch line
        fixed_catch = catch_block.replace('catch (error: any) {', 'catch (error: unknown) {\n      const errorMessage = error instanceof Error ? error.message : "Unknown error";')
        
        # Replace error.message with errorMessage
        fixed_catch = re.sub(r'error\.message', 'errorMessage', fixed_catch)
        
        return fixed_catch
    
    # Apply the replacement
    fixed_content = re.sub(pattern, replace_catch, content, flags=re.DOTALL)
    
    # Only write if changes were made
    if fixed_content != content:
        with open(file_path, 'w', encoding='utf-8') as f:
            f.write(fixed_content)
        return True
    
    return False

def main():
    # Find all TypeScript files
    ts_files = glob.glob('src/**/*.ts', recursive=True)
    
    fixed_count = 0
    
    for file_path in ts_files:
        if fix_catch_blocks(file_path):
            fixed_count += 1
            print(f"Fixed: {file_path}")
    
    print(f"\nFixed {fixed_count} files")

if __name__ == '__main__':
    main()
