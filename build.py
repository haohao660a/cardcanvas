#!/usr/bin/env python3
"""
卡牌生成器构建脚本
功能：
1. 读取 dist/index.html，将其转换为 base64 编码
2. 用编码后的内容替换 __SAVE_TEMPLATE_PLACEHOLDER__ 占位符
3. 读取 default.js，将其转换为 base64 编码
4. 用编码后的内容替换 __DEFAULT_CODE_PLACEHOLDER__ 占位符
5. 将空用户数据(base64)替换 __USER_DATA_PLACEHOLDER__ 占位符
6. 将最终结果保存到 dist/main.html
"""

import base64
import os
from pathlib import Path

def read_file(file_path):
    """读取文件内容"""
    try:
        with open(file_path, 'r', encoding='utf-8') as f:
            return f.read()
    except FileNotFoundError:
        print(f"❌ 错误：找不到文件 {file_path}")
        raise
    except Exception as e:
        print(f"❌ 错误：读取文件 {file_path} 失败 - {e}")
        raise

def write_file(file_path, content):
    """写入文件内容"""
    try:
        # 确保目录存在
        os.makedirs(os.path.dirname(file_path), exist_ok=True)
        with open(file_path, 'w', encoding='utf-8') as f:
            f.write(content)
        print(f"✅ 成功写入文件：{file_path}")
    except Exception as e:
        print(f"❌ 错误：写入文件 {file_path} 失败 - {e}")
        raise

def text_to_base64(text):
    """将文本转换为 base64 编码"""
    # 使用 UTF-8 编码
    text_bytes = text.encode('utf-8')
    # 转换为 base64
    base64_bytes = base64.b64encode(text_bytes)
    # 转换为字符串
    return base64_bytes.decode('utf-8')

def process_template(template_path, default_code_path, output_path):
    """
    处理模板文件
    
    Args:
        template_path: 模板HTML文件路径（包含占位符）
        default_code_path: 默认代码文件路径
        output_path: 输出文件路径
    """
    print("🚀 开始处理模板...")
    
    # 1. 读取模板文件
    print(f"📖 读取模板文件：{template_path}")
    template_content = read_file(template_path)
    
    # 2. 检查并处理 __SAVE_TEMPLATE_PLACEHOLDER__ 占位符
    save_placeholder = "__SAVE_TEMPLATE_PLACEHOLDER__"
    if save_placeholder not in template_content:
        print(f"⚠️ 警告：未找到 {save_placeholder} 占位符")
    else:
        print(f"🔍 找到 {save_placeholder} 占位符")
        
        # 将整个 index.html 转换为 base64
        print("📦 将 index.html 转换为 base64...")
        template_base64 = text_to_base64(template_content)
        
        # 替换占位符
        template_content = template_content.replace(save_placeholder, template_base64)
        print(f"✅ 已替换 {save_placeholder} 占位符")
    
    # 3. 检查并处理 __DEFAULT_CODE_PLACEHOLDER__ 占位符
    default_placeholder = "__DEFAULT_CODE_PLACEHOLDER__"
    if default_placeholder not in template_content:
        print(f"⚠️ 警告：未找到 {default_placeholder} 占位符")
    else:
        print(f"🔍 找到 {default_placeholder} 占位符")
        
        # 读取默认代码
        print(f"📖 读取默认代码文件：{default_code_path}")
        default_code = read_file(default_code_path)
        
        # 将默认代码转换为 base64
        print("📦 将默认代码转换为 base64...")
        code_base64 = text_to_base64(default_code)
        
        # 替换占位符
        template_content = template_content.replace(default_placeholder, code_base64)
        print(f"✅ 已替换 {default_placeholder} 占位符")

    # 4. 检查并处理 __USER_DATA_PLACEHOLDER__ 占位符（注入空用户数据）
    user_data_placeholder = "__USER_DATA_PLACEHOLDER__"
    if user_data_placeholder not in template_content:
        print(f"⚠️ 警告：未找到 {user_data_placeholder} 占位符")
    else:
        print(f"🔍 找到 {user_data_placeholder} 占位符")
        # 空用户数据的 base64（空字符串），表示无用户数据，加载时使用代码默认值
        user_data_base64 = text_to_base64("")
        template_content = template_content.replace(user_data_placeholder, user_data_base64)
        print(f"✅ 已替换 {user_data_placeholder} 占位符（注入空数据）")

    # 5. 写入输出文件
    print(f"💾 保存输出文件：{output_path}")
    write_file(output_path, template_content)
    
    # 5. 输出统计信息
    print("\n📊 处理完成统计：")
    print(f"   - 模板文件大小：{len(template_content):,} 字符")
    if save_placeholder in template_content:
        print(f"   - 剩余 {save_placeholder} 占位符：0")
    if default_placeholder in template_content:
        print(f"   - 剩余 {default_placeholder} 占位符：0")
    
    return template_content

def main():
    """主函数"""
    # 定义文件路径
    dist_dir = Path("dist")
    template_path = dist_dir / "index.html"
    default_code_path = Path("default.js")
    output_path = dist_dir / "main.html"
    
    # 检查必要文件是否存在
    print("🔍 检查文件...")
    
    if not template_path.exists():
        print(f"❌ 错误：模板文件不存在 - {template_path}")
        print("请先构建项目生成 dist/index.html")
        return
    
    if not default_code_path.exists():
        print(f"❌ 错误：默认代码文件不存在 - {default_code_path}")
        print("请确保 default.js 文件存在")
        return
    
    print("✅ 所有必要文件检查通过\n")
    
    try:
        # 处理模板
        process_template(
            template_path=str(template_path),
            default_code_path=str(default_code_path),
            output_path=str(output_path)
        )
        print("\n🎉 构建完成！输出文件：", output_path)
        
    except Exception as e:
        print(f"\n❌ 构建失败：{e}")
        return 1
    
    return 0

if __name__ == "__main__":
    exit(main())