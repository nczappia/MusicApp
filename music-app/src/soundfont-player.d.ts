declare module "soundfont-player" {
  interface Player {
    play(
      note: number | string,
      when?: number,
      options?: { duration?: number; gain?: number; loop?: boolean }
    ): AudioBufferSourceNode;
    stop(when?: number): Player;
    connect(destination: AudioNode): Player;
    disconnect(): Player;
  }

  interface Options {
    soundfont?: "FluidR3_GM" | "MusyngKite";
    format?: "mp3" | "ogg";
    gain?: number;
  }

  function instrument(
    ctx: AudioContext,
    name: string,
    options?: Options
  ): Promise<Player>;

  export { instrument };
  export type { Player, Options };
}
