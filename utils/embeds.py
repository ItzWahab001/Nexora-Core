import discord

def embed(title, description="", color=discord.Color.blurple()):
    e = discord.Embed(title=title, description=description, color=color, timestamp=discord.utils.utcnow())
    return e
